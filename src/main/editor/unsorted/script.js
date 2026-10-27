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

// =====================================================================
// header.kind prefix mapping + recursive element indexing +
// relationship resolution (TDD DEC-5, ASM-3, ASM-4; PRD FR-6/FR-7).
// =====================================================================

const ARCHICODE_KIND_PREFIX = 'archicode.morin.io/';

// Mirrors ManifestKind's seven element constants (it has three more, `view`, `story` and `plateau`: manifests that are not elements,
// see "Stories" and "The plateaus of a workspace") (ASM-3a's fully-qualified vocabulary). A group is no kind any more, here and on the command line
// (issue #114): `group`, `container-group`, `solution-group` and `system-group` give the sentence of `GROUP_IS_GONE`.
const ARCHICODE_KIND_MAP = {
  'component': { category: 'application', rootKind: 'component' },
  'container': { category: 'application', rootKind: 'container' },
  'person': { category: 'application', rootKind: 'person' },
  'solution': { category: 'application', rootKind: 'solution' },
  'system': { category: 'application', rootKind: 'system' },
  'environment': { category: 'technology', rootKind: 'environment' },
  'node': { category: 'technology', rootKind: 'node' }
};

function stripArchicodeKindPrefix(fullKind) {
  if (typeof fullKind === 'string') {
    const written = fullKind.trim().toLowerCase(); // the command line reads a kind in any case, and with spaces around it
    if (written.indexOf(ARCHICODE_KIND_PREFIX) === 0) return written.slice(ARCHICODE_KIND_PREFIX.length);
  }
  return fullKind;
}

/** Whether an item of a list has a value: the command line leaves an item with no value (`- ` or `null`) out of a list. */
function isPresent(item) {
  return item !== null && item !== undefined;
}

/**
 * The list without its `n`th item that has a value, the items with no value left where they are: `withoutNthPresent([null, 'a', null, 'b'], 1)` is `[null, 'a', null]`. The forms of an
 * element draw the pills of `qualifiers`, `applications` and `uses` without the items with no value and address a pill by its place among those drawn (`data-index`), while the list
 * the edit is made on may still hold them (the manifest does, the resolution of a plateau may not): counting the items with a value reaches the same item in either (issue #120; a
 * relationship is addressed by its place in the file, `fileIndex`, #105).
 */
function withoutNthPresent(list, n) {
  const copy = Array.isArray(list) ? list.slice() : [];
  let seen = -1;
  for (let place = 0; place < copy.length; place++) {
    if (!isPresent(copy[place])) continue;
    seen++;
    if (seen === n) { copy.splice(place, 1); break; }
  }
  return copy;
}

/**
 * Recursively index one element node (manifest-root or nested) and its
 * descendants (content.elements, at any depth) into `index[category]`.
 * Returns the ElementRecord (CTR-1 shape) for this node.
 *
 * `level` (TDD-0010 DEC-3) is the nesting-rule level this node sits at —
 * one of 'solution'|'system'|'container'|'component'|'person'|
 * 'environment'|'node': its own bare `kind` string. The caller (`buildIndex`) computes
 * the manifest root's own `level` once, from its un-generalized
 * `bareKind`, before ever calling this function for that root.
 */
function indexElementRecursive(node, kind, reference, sourceFile, category, index, settings, level, declarations, attachedRoots) {
  const rawRelationships = Array.isArray(node.relationships) ? node.relationships : [];
  // an item with no value is no relationship (the command line reads none, issue #105): it is left out, and each relationship keeps its place in the list it was read from
  // (`fileIndex`: the list of the manifest; in a plateau that patches the element, the list the plateau resolves), which the forms of an element address it by (`data-index`)
  const relationships = rawRelationships.map((r, fileIndex) => ({ r, fileIndex })).filter(({ r }) => isPresent(r)).map(({ r, fileIndex }) => {
    const rel = r && typeof r === 'object' ? r : {};
    return {
      fileIndex,
      // Jackson reads a number or a boolean into a String field: a destination `8080` names the element "8080"
      destination: (typeof rel.destination === 'number' || typeof rel.destination === 'boolean') ? String(rel.destination) : rel.destination,
      label: (rel.label !== undefined && rel.label !== null) ? rel.label : settings.relationships.defaultSyntheticLabel,
      // The label as written in the manifest (null when absent): the viewpoint kernel needs it, because ArchiCode
      // draws a natural link without a label, whereas `label` above is the display fallback.
      rawLabel: (rel.label !== undefined && rel.label !== null) ? rel.label : null,
      qualifiers: Array.isArray(rel.qualifiers) ? rel.qualifiers.filter(isPresent) : [], // an item with no value is no item
      tags: rel.tags && typeof rel.tags === 'object' ? rel.tags : {},
      resolved: false // filled in by resolveRelationships (FLOW-4)
    };
  });

  const record = {
    reference,
    layer: category, // 'application' | 'technology': a reference can exist in both, and then only the layer tells them apart
    kind,
    level,
    id: node.id,
    name: node.name !== undefined ? node.name : null,
    description: node.description !== undefined ? node.description : null,
    qualifiers: Array.isArray(node.qualifiers) ? node.qualifiers.filter(isPresent) : [],
    tags: node.tags && typeof node.tags === 'object' ? node.tags : {},
    applications: Array.isArray(node.applications) ? node.applications.filter(isPresent) : [],
    uses: Array.isArray(node.uses) ? node.uses.filter(isPresent) : [], // an environment: where the dependencies of its applications are looked for
    replaces: Array.isArray(node.replaces) ? node.replaces : [], // wave 009: the references of the baseline this element replaces (the comparison reads it; nothing else does)
    relationships,
    children: [],
    sourceFile
  };

  index[category].set(reference, record);
  if (declarations) {
    if (!declarations[category].has(reference)) declarations[category].set(reference, []);
    declarations[category].get(reference).push(sourceFile);
  }

  const childNodes = Array.isArray(node.elements) ? node.elements : [];
  for (const childNode of childNodes) {
    if (!childNode || typeof childNode !== 'object' || !childNode.id) continue;
    // ASM-3b: a nested element carries its own *bare* kind discriminator
    // directly (no prefix stripping, unlike header.kind).
    const childReference = reference + '.' + childNode.id;
    // wave 014 (run 0080): in a graph resolved from layers, the root of a manifest that says `header.parent` sits inside the element it names: it keeps
    // the kind, the level and the file of its own manifest (`attachedRoots`: Map layer|reference -> { kind, level, file }); the old callers pass none
    const attached = attachedRoots ? attachedRoots.get(category + '|' + childReference) : undefined;
    const childKind = attached ? attached.kind : childNode.kind;
    // DEC-3: the level of a node is its own kind
    const childLevel = attached ? attached.level : childKind;
    const childRecord = indexElementRecursive(childNode, childKind, childReference, attached ? attached.file : sourceFile, category, index, settings, childLevel, declarations, attachedRoots);
    record.children.push(childRecord);
  }

  return record;
}

/**
 * The kinds a parent of a type holds: the kinds of the interface its `elements` takes, from `READ_SCHEMA`, which `EditorReadSchemaTest` compares with the classes (the
 * `Parent<...>` each class implements and the `@JsonSubTypes` of that interface). This is the one rule of the page for "which kind a parent holds" (issue #87); the command
 * line reads it from the same classes (`Nesting.java`). A type that holds nothing (a person, a component) gives [].
 */
function nestingKindsOfType(typeName) {
  const type = READ_SCHEMA.types[typeName];
  const spec = type && type.extends === 'Element' && type.fields ? type.fields.elements : undefined; // an element: the workspace and its two layers hold elements, and are no level
  const iface = typeof spec === 'string' && spec.indexOf('[*') === 0 ? spec.slice(2, -1) : null;
  const kinds = iface ? Object.keys(READ_SCHEMA.kinds[iface] || {}) : [];
  return kinds.sort();
}

/**
 * The child-kind nesting-rule table (TDD DEC-3, TG-4) as a function of the nesting-rule level of the parent ('solution', 'system', 'container', 'environment', 'node').
 * Returns the list of bare kinds a node at `level` may contain as a new child; an empty array means `level` is a leaf (`'component'`/`'person'`, or any unrecognized level).
 */
function childKindOptionsForLevel(level) {
  if (typeof level !== 'string' || level === '') return [];
  return nestingKindsOfType(level.charAt(0).toUpperCase() + level.slice(1));
}

/** `childKindOptionsForLevel`, keyed off an `ElementRecord`'s own `level` (DEC-3). */
function childKindOptionsFor(record) {
  return childKindOptionsForLevel(record.level);
}

// =====================================================================
// The plateaus of a workspace (wave 014, run 0077): a plateau is a layer over the plateau it overrides. A manifest says which plateau it belongs to
// with `plateau: <id>` in its header (a manifest without one belongs to `baseline`, the implicit root), and an optional manifest of kind `plateau`
// gives the plateau a name, a horizon, the plateau it overrides (`override`) and its patches. The tree of plateaus is checked here with the sentences
// of the command line (`PlateauTree.java`): keep them alike. Nothing is loaded as a layer yet: the editor draws `baseline` alone.
// =====================================================================

const BASELINE_PLATEAU = 'baseline';
const LAYER_PLATEAU_ID_PATTERN = /^[a-z0-9_-]+$/;

/** Strings in the order Java's `String.compareTo` gives (UTF-16 code units), which orders the sentences of the command line. */
function compareUnits(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Some names for a sentence, as `PlateauTree.list`: `a`, `a` and `b`, `a`, `b` and `c`, and past three the first three and how many more (`all`: every one of them). */
function plateauNames(names, all) {
  const quoted = names.map((n) => '`' + n + '`');
  if (quoted.length === 1) return quoted[0];
  if (quoted.length <= 3 || all) return quoted.slice(0, -1).join(', ') + ' and ' + quoted[quoted.length - 1];
  return quoted.slice(0, 3).join(', ') + ' and ' + (quoted.length - 3) + ' more';
}

/** A plateau that only headers name: no manifest of kind plateau, not the root (`PlateauTree.Node.headerOnly`). */
function plateauIsHeaderOnly(node) {
  return node.manifest === null && node.id !== BASELINE_PLATEAU && node.headers.length > 0;
}

/** Whether two ids differ by one letter added, removed or changed. */
function oneLetterApart(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  let i = 0;
  while (i < shorter.length && shorter[i] === longer[i]) i++;
  if (shorter.length === longer.length) return shorter.slice(i + 1) === longer.slice(i + 1);
  return shorter.slice(i) === longer.slice(i + 1);
}

/** The plateau a header names: its text, or null when the key is absent or empty-valued (the command line reads a null `plateau` as none). */
function headerPlateau(header) {
  if (!header || readIsMissing(header.plateau)) return null;
  return String(header.plateau);
}

/** Whether a manifest of this kind belongs to no plateau: a view and a story are the workspace's whatever plateau is drawn (wave 015, run 0100, issue #100); only elements, patches and plateaus are layers. */
function isPlateauFreeManifest(mf) {
  const kind = mf && mf.header ? manifestKindName(mf.header.kind) : null;
  return kind === 'view' || kind === 'story';
}

/** The plateau a manifest belongs to: the one its header names, else `baseline`. Null for a view and a story, which belong to none (their `plateau:` is accepted and means nothing: no message, no plateau). */
function plateauOfManifest(mf) {
  if (isPlateauFreeManifest(mf)) return null;
  const written = headerPlateau(mf.header);
  return written === null ? BASELINE_PLATEAU : written;
}

/**
 * The cycles of `parents` (a Map id -> parent id), each told once and starting from its smallest id, as `PlateauTree.cycles` tells them.
 */
function plateauCycles(parents) {
  const out = new Map(); // smallest id -> sentence (a cycle met from each of its plateaus is told once)
  for (const start of parents.keys()) {
    const path = [];
    let at = start;
    while (at !== undefined && at !== null && !path.includes(at)) {
      path.push(at);
      at = parents.get(at);
    }
    if (at === undefined || at === null) continue;
    const cycle = path.slice(path.indexOf(at));
    const smallest = cycle.reduce((a, b) => (compareUnits(a, b) <= 0 ? a : b));
    const from = cycle.indexOf(smallest);
    const rotated = cycle.slice(from).concat(cycle.slice(0, from));
    if (rotated.length === 1) {
      out.set(smallest, 'the plateau `' + smallest + '` overrides itself');
    } else {
      const steps = rotated.map((id, i) => '`' + id + '` overrides `' + rotated[(i + 1) % rotated.length] + '`');
      out.set(smallest, 'the plateaus ' + plateauNames(rotated, true) + ' form a cycle: ' + steps.join(', '));
    }
  }
  return Array.from(out.keys()).sort(compareUnits).map((k) => out.get(k));
}

/**
 * The tree of the plateaus of the manifests, checked: `{ nodes, ids, problems, redeclared, warnings, layered }`. `nodes` is a Map id -> `{ id, name,
 * horizon, parent, patches, manifest, headers }` in the order of the tree (`baseline`, then what overrides it, each followed by what overrides it,
 * the siblings by id); `problems` are the mistakes of the tree, one sentence each (the command line stops on them); `warnings` are what is odd
 * without being wrong. A manifest with an error is left out: the file says why.
 */
function buildPlateauTree(manifestFiles) {
  const declaredBy = new Map(); // id -> [{ content, source }]
  const headers = new Map(); // id -> [relPath]
  let layered = false; // a manifest of kind plateau, or a header that says `plateau:`
  for (const mf of manifestFiles) {
    if (mf.error || !mf.header || !mf.content) continue;
    if (manifestKindName(mf.header.kind) === 'plateau') {
      const id = String(mf.content.id);
      if (!declaredBy.has(id)) declaredBy.set(id, []);
      declaredBy.get(id).push({ content: mf.content, source: mf.relPath });
      layered = true;
      continue;
    }
    if (isPlateauFreeManifest(mf)) continue; // a view and a story name no plateau
    const written = headerPlateau(mf.header);
    if (written === null) continue;
    if (!headers.has(written)) headers.set(written, []);
    headers.get(written).push(mf.relPath);
    layered = true;
  }
  const model = { nodes: new Map(), ids: [], problems: [], redeclared: [], warnings: [], layered };
  if (!layered) {
    model.nodes.set(BASELINE_PLATEAU, { id: BASELINE_PLATEAU, name: null, horizon: null, parent: null, patches: [], manifest: null, headers: [] });
    model.ids = [BASELINE_PLATEAU];
    return model;
  }

  const ids = Array.from(new Set([...declaredBy.keys(), ...headers.keys(), BASELINE_PLATEAU])).sort(compareUnits);
  const problems = model.problems;
  for (const id of ids) {
    if (!LAYER_PLATEAU_ID_PATTERN.test(id)) {
      const files = new Set(headers.get(id) || []);
      for (const d of declaredBy.get(id) || []) files.add(d.source);
      problems.push('the plateau id `' + id + '` in ' + plateauNames(Array.from(files).sort(compareUnits)) + ' is not valid: use lowercase letters, digits, `_` and `-`');
    }
  }
  for (const id of Array.from(declaredBy.keys()).sort(compareUnits)) {
    const all = declaredBy.get(id);
    if (all.length > 1) problems.push(duplicateReferenceMessage(id, all.map((d) => d.source), 'plateau'));
  }
  const parents = new Map();
  for (const id of ids) {
    const first = (declaredBy.get(id) || [])[0];
    const override = first && !readIsMissing(first.content.override) ? String(first.content.override) : null;
    if (id === BASELINE_PLATEAU) {
      if (override !== null) problems.push('the plateau `baseline` (`' + first.source + '`) is the root of the plateaus and cannot override `' + override + '`');
      continue;
    }
    const parent = override === null ? BASELINE_PLATEAU : override;
    if (!ids.includes(parent)) {
      problems.push('the plateau `' + id + '` (`' + first.source + '`) overrides `' + parent + '`, which is not a plateau of this workspace (the plateaus are ' + plateauNames(ids, true) + ')');
      continue;
    }
    parents.set(id, parent);
  }
  problems.push(...plateauCycles(parents));
  if (problems.length) return model;

  const children = new Map();
  for (const [id, parent] of parents) {
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(id);
  }
  const order = [];
  const preorder = (id) => {
    order.push(id);
    for (const child of (children.get(id) || []).sort(compareUnits)) preorder(child);
  };
  preorder(BASELINE_PLATEAU);
  for (const id of order) {
    const own = (declaredBy.get(id) || [])[0];
    const content = own ? own.content : null;
    model.nodes.set(id, {
      id,
      name: content && !readIsMissing(content.name) ? String(content.name) : null,
      horizon: content && !readIsMissing(content.horizon) ? String(content.horizon) : null,
      parent: id === BASELINE_PLATEAU ? null : parents.get(id),
      patches: content && Array.isArray(content.patches) ? content.patches.filter((patch) => !readIsMissing(patch)) : [],
      manifest: own ? own.source : null,
      headers: Array.from(new Set(headers.get(id) || [])).sort(compareUnits)
    });
  }
  model.ids = order;

  const sorted = Array.from(model.nodes.keys()).sort(compareUnits);
  for (const id of sorted) {
    const node = model.nodes.get(id);
    if (plateauIsHeaderOnly(node)) {
      model.warnings.push('the plateau `' + id + '` exists only through the `plateau` key of the header of ' + plateauNames(node.headers) + ': it has no manifest of kind `archicode.morin.io/plateau`, so it overrides `baseline` and has no name');
    }
  }
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      // only a plateau that headers alone name can be a typo: two plateaus with a manifest each (`p1`, `p2`) are the author's choice (A1)
      if (oneLetterApart(sorted[i], sorted[j]) && (plateauIsHeaderOnly(model.nodes.get(sorted[i])) || plateauIsHeaderOnly(model.nodes.get(sorted[j])))) model.warnings.push('the plateaus `' + sorted[i] + '` and `' + sorted[j] + '` have ids one letter apart: check that one of them is not a typo');
    }
  }
  for (const id of sorted) {
    const node = model.nodes.get(id);
    const parent = node.parent === null ? null : model.nodes.get(node.parent);
    // earlier means the whole period ends before the period above begins: `2026` under `2026-Q4` is not earlier, `2026-Q1` is
    const own = parent ? horizonPeriod(node.horizon) : null;
    const above = parent ? horizonPeriod(parent.horizon) : null;
    if (own !== null && above !== null && own.end < above.start) {
      model.warnings.push('the horizon `' + node.horizon + '` of the plateau `' + id + '` is earlier than the horizon `' + parent.horizon + '` of the plateau it overrides, `' + parent.id + '`');
    }
    model.warnings.push(...repeatedSetWarnings(node));
  }
  return model;
}

/**
 * The warnings for two `SET` of the same field of the same element in one plateau: the last one wins (`PlateauTree.repeatedSets`; variant V9 of the
 * Brightcart document). Only patches that name a `target` are compared: what a `json-path` selects is not known before the patches are applied.
 */
function repeatedSetWarnings(node) {
  const ranks = new Map(); // key -> { what, ranks }
  node.patches.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object' || String(raw.operator).toUpperCase() !== 'SET' || readIsMissing(raw.target)) return;
    const where = !readIsMissing(raw.where) && typeof raw.where === 'object' ? raw.where : null;
    const field = !readIsMissing(raw.field) ? String(raw.field) : where ? 'relationships' : null;
    if (field === null) return;
    const layer = !readIsMissing(raw.layer) && String(raw.layer).toLowerCase() === 'technology' ? 'technology' : 'application';
    const towards = where ? ' (the relationship towards `' + String(where.destination) + '`' + (!readIsMissing(where.label) ? ' labelled `' + String(where.label) + '`' : '') + ')' : '';
    const key = layer + '|' + String(raw.target) + '|' + field + towards;
    if (!ranks.has(key)) ranks.set(key, { what: '`' + field + '` of `' + String(raw.target) + '`' + towards, ranks: [] });
    ranks.get(key).ranks.push(i + 1);
  });
  const out = [];
  for (const { what, ranks: all } of ranks.values()) {
    if (all.length > 1) out.push('the plateau `' + node.id + '` sets ' + what + ' in patches ' + (all.length === 2 ? all.join(' and ') : all.slice(0, -1).join(', ') + ' and ' + all[all.length - 1]) + ': the last one wins');
  }
  return out;
}

/** The plateaus from the root down to `id`, itself last (`PlateauTree.chain`): what a plateau is loaded from. */
function plateauChain(model, id) {
  const chain = [];
  for (let at = model.nodes.get(id); at; at = at.parent === null ? null : model.nodes.get(at.parent)) chain.unshift(at);
  return chain;
}

/**
 * A reference declared in a plateau and again in one of its ancestors is a mistake (`PlateauTree.redeclared`): two plateaus that do not stack may each declare it. A view and a
 * story belong to no plateau (wave 015, run 0100): they are not concerned. `declarations`: Map plateau id -> { application, technology } (Map reference -> files).
 * Adds the sentences to `model.redeclared` (the command line tells them after the references declared twice in a plateau).
 */
function checkPlateauRedeclarations(model, declarations) {
  if (model.problems.length) return;
  const messages = new Map(); // reference -> [message]
  for (const id of model.ids) {
    const own = declarations.get(id);
    if (!own) continue;
    const chain = plateauChain(model, id);
    for (const ancestor of chain.slice(0, -1)) {
      const above = declarations.get(ancestor.id);
      if (!above) continue;
      for (const namespace of ['application', 'technology']) {
        for (const [reference, sources] of own[namespace]) {
          const ancestorSources = above[namespace].get(reference);
          if (!ancestorSources) continue;
          const names = (files) => plateauNames(Array.from(new Set(files)).sort(compareUnits));
          if (!messages.has(reference)) messages.set(reference, new Set());
          messages.get(reference).add('the reference `' + reference + '` is declared in the plateau `' + id + '` (' + names(sources) + ') and again in its ancestor `' + ancestor.id + '` (' + names(ancestorSources) + ')');
        }
      }
    }
  }
  for (const reference of Array.from(messages.keys()).sort(compareUnits)) {
    for (const message of Array.from(messages.get(reference)).sort(compareUnits)) model.redeclared.push(message);
  }
}


// =====================================================================
// The layers (wave 014, run 0080). A plateau is drawn as its chain: for each plateau from `baseline` down to it, the elements whose manifests say
// `plateau: <layer>` are added to the graph of the plateau above, then the ordered patches of the layer change that graph (the kernel's `apply_patches`),
// then the layer is checked: what the graph points at must be there (what the views and stories name is not a layer's mistake: `entryProblemsOf`). A mistake names the
// layer, in the sentences of the command line (`LayerLoader.java`: keep them alike). The first layer that is wrong ends the chain.
//
// The result of a layer is a *state* (the JSON graph, who declared each root, which patch set which field, the REMOVE patches with their cascade) and is
// kept per plateau, so that a plateau reuses the state of the plateau it overrides and a click on the band resolves nothing twice. The states and the models
// drawn from them (`layerModelOf`) are kept for as long as the tree of the plateaus (`AppState.plateauTree`, rebuilt by every load and every edit) and the
// text of the manifests are what they were; any edit ends in `rebuildIndexAndRender`, which builds a new tree, so a cache that was not told is not used.
// =====================================================================

const LAYER_NAMES = ['application', 'technology'];

/**
 * The period a horizon label reads as, `{ start, end }`, each a number that sorts (`yyyymmdd`), or null when it reads as none: `2026`, `2026-10`, `2026-10-18`, a quarter
 * (`2026-Q4`, `2026Q4`) or a half (`2026-H2`). The first and the last day of the period. `PlateauTree.horizonPeriod` reads labels the same way: keep them alike.
 */
function horizonPeriod(label) {
  if (label === null || label === undefined) return null;
  const text = String(label).trim();
  const valid = (year, month, day) => {
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? year * 10000 + month * 100 + day : null;
  };
  const lastDay = (year, month) => valid(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());
  const period = (start, end) => (start === null || end === null ? null : { start, end });
  let m = /^(\d{4})$/.exec(text);
  if (m) return period(valid(Number(m[1]), 1, 1), valid(Number(m[1]), 12, 31));
  m = /^(\d{4})-(\d{2})$/.exec(text);
  if (m) return period(valid(Number(m[1]), Number(m[2]), 1), lastDay(Number(m[1]), Number(m[2])));
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m) return period(valid(Number(m[1]), Number(m[2]), Number(m[3])), valid(Number(m[1]), Number(m[2]), Number(m[3])));
  m = /^(\d{4})-?Q([1-4])$/i.exec(text);
  if (m) return period(valid(Number(m[1]), (Number(m[2]) - 1) * 3 + 1, 1), lastDay(Number(m[1]), Number(m[2]) * 3));
  m = /^(\d{4})-?H([12])$/i.exec(text);
  if (m) return period(valid(Number(m[1]), (Number(m[2]) - 1) * 6 + 1, 1), lastDay(Number(m[1]), Number(m[2]) * 6));
  return null;
}

/** The date a horizon label reads as (the first day of its period, `yyyymmdd`), or null when it reads as none: what orders the siblings of the band. */
function horizonDate(label) {
  const period = horizonPeriod(label);
  return period === null ? null : period.start;
}

/**
 * The order of the siblings in the band (the Open Question "the order of the layers in a band"): the plateaus whose horizon reads as a date come first, by date
 * and then by id; the others follow, by id (code units, as the rest of the plateaus are sorted). A total order, so the band is the same on every opening.
 */
function compareBandSiblings(a, b) {
  const da = horizonDate(a.horizon);
  const db = horizonDate(b.horizon);
  if (da !== null && db !== null) return da - db || compareUnits(a.id, b.id);
  if (da !== null) return -1;
  if (db !== null) return 1;
  return compareUnits(a.id, b.id);
}

/** The tree of the band: `{ id, node, children: [...] }` from `baseline` down, the siblings in the order of `compareBandSiblings`. Null when the tree has no nodes. */
function bandTreeOf(tree) {
  if (!tree || !tree.nodes || !tree.nodes.has(BASELINE_PLATEAU)) return null;
  const children = new Map();
  for (const node of tree.nodes.values()) {
    if (node.parent === null) continue;
    if (!children.has(node.parent)) children.set(node.parent, []);
    children.get(node.parent).push(node);
  }
  const build = (node) => ({ id: node.id, node, children: (children.get(node.id) || []).slice().sort(compareBandSiblings).map(build) });
  return build(tree.nodes.get(BASELINE_PLATEAU));
}

/** The ids of the band in reading order (a plateau, then what overrides it): the order the band lists its nodes in. */
function bandOrderOf(tree) {
  const out = [];
  const walk = (item) => { out.push(item.id); item.children.forEach(walk); };
  const root = bandTreeOf(tree);
  if (root) walk(root);
  return out;
}

/** A plateau of the tree as the page holds a plateau: `{ id, name, horizon }`, the texts of its manifest ('' when it has none). */
function layerPlateauModel(id) {
  const node = AppState.plateauTree && AppState.plateauTree.nodes.get(id);
  return { id, name: node && node.name ? node.name : '', horizon: node && node.horizon ? node.horizon : '' };
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

/** A patch as the kernel takes it: the operator in capitals, the layer in lower case, `json-path` as the manifest writes it (the reader also accepts `json_path`). */
function layerKernelPatch(raw) {
  const patch = { operator: String(raw.operator).toUpperCase() };
  const text = (value) => String(value);
  if (!readIsMissing(raw.target)) patch.target = text(raw.target);
  if (!readIsMissing(raw.layer)) patch.layer = text(raw.layer).toLowerCase();
  const jsonPath = !readIsMissing(raw['json-path']) ? raw['json-path'] : raw.json_path;
  if (!readIsMissing(jsonPath)) patch['json-path'] = text(jsonPath);
  if (!readIsMissing(raw.expect)) patch.expect = Number(raw.expect);
  if (!readIsMissing(raw.field)) patch.field = text(raw.field);
  if (!readIsMissing(raw.where) && typeof raw.where === 'object') {
    patch.where = { destination: text(raw.where.destination) };
    if (!readIsMissing(raw.where.label)) patch.where.label = text(raw.where.label);
  }
  if (!readIsMissing(raw.value)) patch.value = raw.value;
  return patch;
}

/** What the manifests of each plateau declare: Map plateau id -> `{ elements }` (the manifests, in the order of the files); a file with an error declares nothing. A view and a story belong to no plateau. */
function layerManifestsByPlateau(manifestFiles) {
  const out = new Map();
  for (const mf of manifestFiles) {
    if (mf.error || !mf.header || !mf.header.kind || !mf.content || mf.content.id === undefined) continue;
    const bare = stripArchicodeKindPrefix(mf.header.kind);
    if (bare === 'plateau' || isPlateauFreeManifest(mf)) continue;
    const plateau = plateauOfManifest(mf);
    if (!out.has(plateau)) out.set(plateau, { elements: [] });
    if (ARCHICODE_KIND_MAP[bare]) out.get(plateau).elements.push(mf);
  }
  return out;
}

function emptyLayerState() {
  return {
    graph: { application: { elements: [] }, technology: { elements: [] } },
    roots: new Map(), // layer|reference -> { kind, level, file, plateau }: the root of every manifest, where it was declared
    patched: new Map(), // layer|reference -> Map field -> { plateau, rank, operator, selector }: the last patch that set the field
    touched: new Map(), // layer|reference -> [{ plateau, rank, operator, selector, field }]: every patch that selected the element
    removals: [], // [{ plateau, rank, operator, selector, touched, removed, dropped }]: the REMOVE patches of the chain, in the order they were applied
    unplaced: new Map(), // layer|id -> reference: a root that says `header.parent` of an element the graph does not have stays at the top, under the reference its manifest gives it
    problems: null // { plateau, sentences }: the mistakes of the first layer of the chain that has some (the command line stops there); the plateau is drawn all the same, so that it can be repaired
  };
}

function cloneLayerState(state) {
  return {
    graph: clonePlain(state.graph),
    roots: new Map(state.roots),
    patched: new Map(Array.from(state.patched, ([key, fields]) => [key, new Map(fields)])),
    touched: new Map(Array.from(state.touched, ([key, list]) => [key, list.slice()])),
    removals: state.removals.slice(),
    unplaced: new Map(state.unplaced),
    problems: state.problems
  };
}

/** Every element of a graph by reference, per layer: Map reference -> the JSON node. */
function graphReferencesOf(graph) {
  const out = { application: new Map(), technology: new Map() };
  const walk = (layer, node, reference) => {
    out[layer].set(reference, node);
    for (const child of Array.isArray(node.elements) ? node.elements : []) {
      if (!child || typeof child !== 'object' || !child.id) continue;
      walk(layer, child, reference + '.' + child.id);
    }
  };
  for (const layer of LAYER_NAMES) {
    for (const root of graph[layer].elements) if (root && typeof root === 'object' && root.id) walk(layer, root, String(root.id));
  }
  return out;
}

/** The references the properties of a view name: `element`, and the entries of `pinned`, `opened` and `hidden` (sorted, once each). */
function namedByProperties(properties) {
  const names = new Set();
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return [];
  if (typeof properties.element === 'string') names.add(properties.element);
  for (const key of ['pinned', 'opened', 'hidden']) {
    for (const entry of Array.isArray(properties[key]) ? properties[key] : []) if (typeof entry === 'string') names.add(entry);
  }
  return Array.from(names).sort(compareUnits);
}

/** The file that declares an element: the manifest of the nearest root at or above its reference (`state.roots`), or null (an element of .archicode.yaml has none). */
function layerFileOf(roots, layer, reference) {
  if (!roots) return null;
  for (let ref = reference; ref; ref = ref.indexOf('.') === -1 ? '' : ref.slice(0, ref.lastIndexOf('.'))) {
    const root = roots.get(layer + '|' + ref);
    if (root) return root.file || null;
  }
  return null;
}

/**
 * What a layer is checked for (`LayerLoader.problems`, `DanglingReferences`): a relationship, an entry of `uses` and an application hosted on a node must name an element of the graph.
 * The sentence says the element, the file that declares it and the key of the reference in it (issue #159); a workspace with no plateau tells it without the plateau, as the command line does.
 * Sorted by element, then by what it points at. What the views and the stories name is not a mistake of a layer: see `entryProblemsOf`.
 * `options.layered` is whether the workspace has plateaus; `options.roots` is `state.roots`, which knows the file of each manifest.
 */
function layerProblemsOf(plateau, graph, options) {
  const layered = !options || options.layered !== false;
  const refs = graphReferencesOf(graph);
  const found = [];
  const in_ = layered ? 'in the plateau `' + plateau + '`, ' : '';
  for (const layer of LAYER_NAMES) {
    for (const [reference, node] of refs[layer]) {
      const file = layerFileOf(options && options.roots, layer, reference);
      const told = (verb, other, key) => '`' + reference + '` ' + verb + ' `' + other + '`, which does not exist, ' + (file ? 'in `' + file + '` ' : '') + 'at `' + key + '`';
      let position = 0;
      for (const rel of Array.isArray(node.relationships) ? node.relationships : []) {
        if (!rel || typeof rel !== 'object') continue;
        const key = 'relationships[' + position++ + '].destination';
        const destination = kernelStringOf(rel.destination);
        if (destination !== null && !refs[layer].has(destination)) found.push({ element: reference, other: destination, sentence: told('has a relationship towards', destination, key) });
      }
      if (node.kind === 'environment') {
        let at = 0;
        for (const used of kernelStringsOf(node.uses)) {
          const key = 'uses[' + at++ + ']';
          if (!refs[layer].has(used)) found.push({ element: reference, other: used, sentence: told('uses', used, key) });
        }
      }
      if (node.kind === 'node') {
        let at = 0;
        for (const application of kernelStringsOf(node.applications)) {
          const key = 'applications[' + at++ + ']';
          if (!refs.application.has(application)) found.push({ element: reference, other: application, sentence: told('hosts', application, key) });
        }
      }
    }
  }
  found.sort((a, b) => compareUnits(a.element, b.element) || compareUnits(a.other, b.other) || compareUnits(a.sentence, b.sentence));
  // one sentence for each thing that is missing: the elements that point at it are one cause (`DanglingReferences.sentences`)
  const byMissing = new Map();
  for (const problem of found) {
    if (!byMissing.has(problem.other)) byMissing.set(problem.other, []);
    byMissing.get(problem.other).push(problem);
  }
  const scope = layered ? ' of the plateau' : '';
  const out = new Set();
  for (const group of byMissing.values()) {
    const others = new Set(group.map((p) => p.element)).size - 1;
    out.add(in_ + group[0].sentence + (others === 0 ? '' : ' (' + others + (others === 1 ? ' more element' + scope + ' points at it)' : ' more elements' + scope + ' point at it)')));
  }
  return Array.from(out);
}

/** The layer a view, or a step of a story, is about: `technology` or else `application` (the command line reads the layer in any case). */
function entryLayerOf(value) {
  return String(value === undefined || value === null ? '' : value).toLowerCase() === 'technology' ? 'technology' : 'application';
}

/** The references that the manifests declare, whatever the plateau, by layer: each root (under its `header.parent`) and every element nested in it (`ManifestParser.declaredReferences`). */
function declaredReferencesOf(manifestFiles) {
  const declared = { application: new Set(), technology: new Set() };
  for (const mf of manifestFiles) {
    const category = manifestLayer(mf);
    if (!category || !mf.content || mf.content.id === undefined || mf.content.id === null) continue;
    walkContentNodes(mf, (node, reference) => { declared[category].add(reference); });
  }
  return declared;
}

/** `declaredReferencesOf` for the manifests as they are, kept with the layer cache (it is dropped when a manifest changes). */
function declaredAnywhereCached() {
  const cache = ensureLayerCache(AppState.workspace.settings);
  if (!cache.declared) cache.declared = declaredReferencesOf(AppState.manifestFiles);
  return cache.declared;
}

/**
 * The plateau-free check (wave 015, run 0100, issue #100): what a view and a story name must exist in at least one plateau. Not a mistake of a plateau: the page tells it
 * once, whatever plateau is drawn. "Exists in a plateau" is decided from what the manifests declare, as `LayerLoader.entryProblems` does (a patch never creates an
 * element). Only a workspace that has plateaus is checked, as the command line does; the views first, then the stories, in the order of the files, those of .archicode.yaml
 * after those of the manifests.
 */
function entryProblemsOf(settings) {
  const tree = AppState.plateauTree;
  const layered = !!(tree && tree.layered);
  // a workspace with no plateau has no layer cache to keep it in (and little to look at: the steps that name a plateau)
  const cache = layered ? ensureLayerCache(settings) : null;
  if (cache && cache.entryProblems !== undefined) return cache.entryProblems;
  const problems = entryProblemsIn(AppState.manifestFiles, tree, layered ? declaredAnywhereCached() : null);
  if (cache) cache.entryProblems = problems;
  return problems;
}

/**
 * `entryProblemsOf` for a list of manifests and the tree of plateaus they make, kept nowhere: what the check would say of the workspace if it had these files (the dialog
 * that deletes a plateau asks it of the files that stay, wave 015 run 0102). `declared`: `declaredReferencesOf(manifestFiles)` when it is known already, else it is computed.
 */
function entryProblemsIn(manifestFiles, tree, declaredGiven) {
  const layered = !!(tree && tree.layered);
  const out = [];
  // what a view or a story step names must exist in a plateau: a workspace with no plateau is not looked at (the editor says a view that cannot be drawn in its place)
  const declared = layered ? declaredGiven || declaredReferencesOf(manifestFiles) : null;
  const told = (noun, id, source, recipe) => {
    if (!layered) return;
    for (const name of namedByProperties(recipe.properties)) {
      if (!declared[entryLayerOf(recipe.layer)].has(name)) out.push('the ' + noun + ' `' + id + '` (`' + source + '`) names `' + name + '`, which exists in no plateau');
    }
  };
  const files = (kind) => manifestFiles.filter((mf) => !mf.error && mf.header && mf.content && isPlainObject(mf.content) && manifestKindName(mf.header.kind) === kind);
  // the views and stories of .archicode.yaml (an older place for them) come after those of the manifests, unless a manifest has the id: it shadows them (`entriesOf`)
  const legacy = (key, kind) => { const own = new Set(files(kind).map((mf) => String(mf.content.id))); return legacyEntries(key).filter((entry) => !own.has(entry.id)); };
  if (layered) {
    for (const mf of files('view')) told('view', mf.content.id, mf.relPath, mf.content);
    for (const view of legacy('views', 'view')) told('view', view.id, '.archicode.yaml', view);
  }
  const ids = layered ? tree.ids : [];
  const broken = !!(tree && tree.problems && tree.problems.length); // a tree that is refused names the plateaus that exist no better than a workspace with none: the tree is what is told
  const tellSteps = (id, source, steps) => {
    // the steps are numbered as the command line does: an item with no value in the list is absent (run 0092), so it takes no number
    (Array.isArray(steps) ? steps : []).filter((step) => step !== null && step !== undefined).forEach((step, i) => {
      if (!isPlainObject(step)) return;
      if (!broken) for (const sentence of stepPlateauProblems(source, id, i + 1, step, ids)) out.push(sentence);
      told('story', id, source, step);
    });
  };
  for (const mf of files('story')) tellSteps(mf.content.id, mf.relPath, mf.content.steps);
  for (const story of legacy('stories', 'story')) tellSteps(story.id, '.archicode.yaml', story.steps);
  return Array.from(new Set(out));
}

/**
 * What a step of a story says about the plateau it is told at (`at`) and the plateau it is compared with (`against`), wave 015 run 0101 (issue #24): each is a text, and
 * an empty one names nothing (`readText`: a key with no value is absent). Returns `{ at, against }`, each a plateau id or null.
 */
function stepPlateauKeys(step) {
  const text = (value) => ((typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') && String(value) !== '' ? String(value) : null);
  return { at: text(step.at), against: text(step.against) };
}

/**
 * The sentences about the plateaus of a step: each must be a plateau of the workspace (`ids`, empty when it has none), and they cannot be one plateau, since a plateau is
 * never compared with itself. `against` with no `at` is read (the step is told at the plateau drawn). The sentences of `LayerLoader.stepPlateauProblems`: keep them alike.
 */
function stepPlateauProblems(source, id, number, step, ids) {
  const keys = stepPlateauKeys(step);
  const where = 'the story `' + id + '` (`' + source + '`) step ' + number + ' says `';
  const out = [];
  let unknown = false;
  for (const key of ['at', 'against']) {
    const value = keys[key];
    if (value === null || ids.includes(value)) continue;
    unknown = true;
    out.push(ids.length ? where + key + ': ' + value + '`, which is not a plateau of this workspace (the plateaus are ' + ids.map((i) => '`' + i + '`').join(', ') + ')' : where + key + ': ' + value + '` but the workspace declares no plateau' + NO_PLATEAU);
  }
  if (!unknown && keys.at !== null && keys.at === keys.against) out.push(where + 'at: ' + keys.at + '` and `against: ' + keys.against + '`: a plateau is never compared with itself');
  return out;
}

/**
 * The level of a node of a graph for the nesting rule: its kind. `refs` is the map reference -> node of a layer. Null when the node is not there.
 */
function nestingLevelIn(refs, reference) {
  const node = refs.get(reference);
  return node && typeof node.kind === 'string' ? node.kind : null;
}

/**
 * The sentence for a manifest declared under a parent that cannot hold its kind: the one of the reader for a nested element of a kind its parent does not hold, with
 * the file, the parent and the place of the fault (`ElementIndexFactory.refusal`): keep them alike.
 */
function nestingProblem(item, held) {
  return '`' + item.mf.relPath + '` is not valid: unknown kind `' + item.rootKind + '` under `' + item.parentReference + '` (known: ' + (held.length ? held.slice().sort(compareUnits).join(', ') : 'none') + ') at `header.kind`';
}

/**
 * The sentence for a manifest with no `header.parent` of a kind its layer does not hold at its top (issue #106, wave 016 run 0108), in the words of `nestingProblem`: the
 * cause, no parent, takes the place of the parent (`ElementIndexFactory.rootRefusal`): keep them alike. Told in a workspace that has plateaus only.
 */
function rootProblem(item, held) {
  return '`' + item.mf.relPath + '` is not valid: unknown kind `' + item.rootKind + '` with no `header.parent` (known: ' + held.join(', ') + ') at `header.kind`';
}

/**
 * One layer: the state of the plateau above (null for the root) with the elements of the manifests of `node` added, then its patches applied by the kernel, then
 * the checks. Returns `{ state }` (`state.problems` holds the sentences of the first layer of the chain that is wrong, told by the command line, which stops there; the
 * graph is built all the same), or `{ fatal, plateau }` when the kernel refuses the patches of the layer: there is no graph then.
 */
function resolveLayerStep(parent, node, context) {
  const state = parent ? cloneLayerState(parent) : emptyLayerState();
  const own = context.byPlateau.get(node.id) || { elements: [] };
  const refs = graphReferencesOf(state.graph);
  const register = (category, json, reference) => {
    const walk = (item, ref) => {
      refs[category].set(ref, item);
      for (const child of Array.isArray(item.elements) ? item.elements : []) if (child && typeof child === 'object' && child.id) walk(child, ref + '.' + child.id);
    };
    walk(json, reference);
  };
  const waiting = [];
  const nesting = { application: new Map(), technology: new Map() }; // reference -> the sentence for a manifest declared under a parent that cannot hold its kind (the command line refuses it when the element is added)
  for (const mf of own.elements) {
    const bare = stripArchicodeKindPrefix(mf.header.kind);
    const { category, rootKind } = ARCHICODE_KIND_MAP[bare];
    const level = rootKind;
    const parentReference = mf.header.parent ? String(mf.header.parent) : null;
    const reference = parentReference ? parentReference + '.' + mf.content.id : String(mf.content.id);
    const json = clonePlain(mf.content);
    json.kind = rootKind;
    const item = { mf, category, rootKind, level, parentReference, reference, json };
    if (parentReference === null) {
      // in a workspace that has plateaus a layer holds only the kinds of its model class at its top: a container, a component or a node with no parent is held by no layer, so
      // a patch could not select it (issue #106). It is drawn where its manifest puts it, so that it can be repaired
      if (context.layered) {
        const held = topLevelKindsOf(category);
        if (held.indexOf(rootKind) === -1) nesting[category].set(reference, rootProblem(item, held));
      }
      state.graph[category].elements.push(json);
      register(category, json, reference);
      state.roots.set(category + '|' + reference, { kind: rootKind, level, file: mf.relPath, plateau: node.id });
    } else {
      waiting.push(item);
    }
  }
  // a manifest that says `header.parent` goes inside the element it names, whichever file comes first
  let pending = waiting;
  while (pending.length) {
    const left = [];
    for (const item of pending) {
      const host = refs[item.category].get(item.parentReference);
      if (!host) { left.push(item); continue; }
      // the parent has to hold the kind (issue #87): told as the command line tells it, and drawn where the manifest puts it, so that it can be repaired
      const held = childKindOptionsForLevel(nestingLevelIn(refs[item.category], item.parentReference));
      if (held.indexOf(item.rootKind) === -1) nesting[item.category].set(item.reference, nestingProblem(item, held));
      if (!Array.isArray(host.elements)) host.elements = [];
      host.elements.push(item.json);
      register(item.category, item.json, item.reference);
      state.roots.set(item.category + '|' + item.reference, { kind: item.rootKind, level: item.level, file: item.mf.relPath, plateau: node.id });
    }
    if (left.length === pending.length) break;
    pending = left;
  }
  // before the patches: a patch may remove a parent, and the elements declared under it go with it. A manifest whose parent is not there is told, and stays at the top
  // (the editor draws what it can, so that the mistake can be repaired in it)
  // told first, and alone (the command line stops there): the application layer, then the technology layer, each by reference, as `ElementIndexFactory.indexLayers` tells them
  let mine = [];
  for (const category of LAYER_NAMES) mine = mine.concat(Array.from(nesting[category].keys()).sort(compareUnits).map((reference) => nesting[category].get(reference)));
  if (pending.length) {
    const sentences = new Map();
    for (const item of pending) {
      sentences.set(item.reference, 'in the plateau `' + node.id + '`, `' + item.reference + '` is declared under `' + item.parentReference + '`, which does not exist');
      state.graph[item.category].elements.push(item.json);
      state.unplaced.set(item.category + '|' + item.json.id, item.reference);
      state.roots.set(item.category + '|' + item.reference, { kind: item.rootKind, level: item.level, file: item.mf.relPath, plateau: node.id });
    }
    const folded = foldParentProblems(Array.from(sentences.keys()).sort(compareUnits).map((k) => sentences.get(k)));
    if (!mine.length) mine = folded;
  }

  if (node.patches.length) {
    // the command line stops at the first layer that is wrong and tells it: a layer before this one (or this one's own parents) that is wrong is what is told, though nothing is drawn
    const earlier = state.problems || (mine.length ? { plateau: node.id, sentences: mine } : null);
    if (!context.kernel) return { fatal: ['the viewpoint kernel is not loaded, so the patches of the plateau `' + node.id + '` cannot be applied'], plateau: node.id, earlier };
    const patches = node.patches.map((raw) => ({ raw, kernel: layerKernelPatch(raw) }));
    const answer = context.kernel.applyPatches({ workspace: { application: state.graph.application, technology: state.graph.technology }, plateau: node.id, patches: patches.map((p) => p.kernel) });
    if (answer.error) return { fatal: [answer.error], plateau: node.id, earlier };
    const layerOf = (value) => ({ elements: value && Array.isArray(value.elements) ? value.elements : [] });
    state.graph = { application: layerOf(answer.workspace && answer.workspace.application), technology: layerOf(answer.workspace && answer.workspace.technology) };
    for (const report of answer.patches || []) {
      const sent = patches[report.rank - 1] ? patches[report.rank - 1].kernel : {};
      const origin = { plateau: node.id, rank: report.rank, operator: report.operator, selector: report.selector };
      // a REMOVE that names a `field` takes the field out of the elements it selects (wave 017, run 0126, #94): nothing leaves the graph, so it is no removal and has no
      // cascade; it is a change of that field, made by the patch, like a SET
      if (report.operator === 'REMOVE' && sent.field === undefined) {
        state.removals.push(Object.assign({ touched: report.touched || [], removed: report.removed || [], dropped: report.dropped || [] }, origin));
        // what the cascade took out of an element that stays is a change of that element's field, made by this patch
        for (const gone of report.dropped || []) {
          const key = gone.layer + '|' + gone.reference;
          if (!state.patched.has(key)) state.patched.set(key, new Map());
          state.patched.get(key).set(gone.field, origin);
          if (!state.touched.has(key)) state.touched.set(key, []);
          state.touched.get(key).push(Object.assign({ field: gone.field }, origin));
        }
        continue;
      }
      const field = sent.field || (sent.where ? 'relationships' : null);
      for (const element of report.touched || []) {
        const key = element.layer + '|' + element.reference;
        if (!state.touched.has(key)) state.touched.set(key, []);
        state.touched.get(key).push(Object.assign({ field }, origin));
        if (field) {
          if (!state.patched.has(key)) state.patched.set(key, new Map());
          state.patched.get(key).set(field, origin);
        }
      }
    }
  }

  // the checks of the layer; told alone when a parent is missing, as the command line tells that first (and stops)
  if (!mine.length) mine = layerProblemsOf(node.id, state.graph, { layered: !!context.layered, roots: state.roots });
  if (!state.problems && mine.length) state.problems = { plateau: node.id, sentences: mine };
  return { state };
}

/**
 * One sentence for the elements declared under a parent the graph does not have: they have one cause (a plateau that overrides the wrong one, a manifest that was
 * left out), so the first one is told, with how many others there are (`LayerLoader.foldParentProblems`).
 */
function foldParentProblems(sentences) {
  if (sentences.length < 2) return sentences;
  const others = sentences.length - 1;
  return [sentences[0] + ' (' + others + (others === 1 ? ' more element of the plateau is declared under a parent that does not exist' : ' more elements of the plateau are declared under a parent that does not exist') + ')'];
}

/** The cache of the states and models of the plateaus, for one tree of plateaus and one text of the manifests (see the note above). */
let layerCache = null;

function layerCacheSignature(manifestFiles) {
  return manifestFiles.map((mf) => [mf, mf.rawText]);
}

function layerCacheHolds(settings) {
  if (!layerCache || layerCache.tree !== AppState.plateauTree || layerCache.settings !== settings || layerCache.kernel !== loadedKernel) return false;
  if (layerCache.label !== settings.relationships.defaultSyntheticLabel || layerCache.signature.length !== AppState.manifestFiles.length) return false;
  return layerCache.signature.every(([mf, text], i) => AppState.manifestFiles[i] === mf && mf.rawText === text);
}

function ensureLayerCache(settings) {
  if (!layerCacheHolds(settings)) {
    const filePlateau = new Map();
    for (const mf of AppState.manifestFiles) filePlateau.set(mf.relPath, plateauOfManifest(mf));
    layerCache = {
      tree: AppState.plateauTree, settings, kernel: loadedKernel, label: settings.relationships.defaultSyntheticLabel, signature: layerCacheSignature(AppState.manifestFiles),
      byPlateau: layerManifestsByPlateau(AppState.manifestFiles), filePlateau, states: new Map(), models: new Map(), counters: { steps: 0, models: 0 }
    };
  }
  return layerCache;
}

/** The state of a plateau: `{ state }` or `{ fatal, plateau }`. A plateau whose ancestor has no graph has none. */
function layerStateOf(id, settings) {
  const cache = ensureLayerCache(settings);
  if (cache.states.has(id)) return cache.states.get(id);
  const node = cache.tree.nodes.get(id);
  const above = node.parent === null ? null : layerStateOf(node.parent, settings);
  let result;
  if (above && above.fatal) {
    result = above;
  } else {
    cache.counters.steps++;
    result = resolveLayerStep(above ? above.state : null, node, { byPlateau: cache.byPlateau, kernel: loadedKernel, layered: !!cache.tree.layered });
  }
  cache.states.set(id, result);
  return result;
}

/**
 * The model of a plateau, as the page draws it: `{ id, plateau, index, roots, stats, removals, problems, failedAt, undrawable }`. `index` holds the records of every
 * element of the chain, each with where it was declared (`declaredIn`, `sourceFile`) and the fields a patch set (`patched`), `roots` the records with no parent per layer;
 * `problems` is null, or the sentences of the first layer of the chain that is wrong (`failedAt`), which the command line refuses the plateau for. The plateau is drawn
 * all the same (a link to nothing, a parent that is not there), so that it can be repaired, unless `undrawable`: the kernel refused the patches of a layer, there is no
 * graph, the index is empty and `problems` holds the kernel's sentence.
 */
function layerModelOf(id, settings) {
  const cache = ensureLayerCache(settings);
  if (cache.models.has(id)) return cache.models.get(id);
  const result = layerStateOf(id, settings);
  const index = { application: new Map(), technology: new Map() };
  const roots = { application: [], technology: [] };
  let stats = { total: 0, dangling: 0 };
  let removals = [];
  if (!result.fatal) {
    const state = result.state;
    for (const category of LAYER_NAMES) {
      for (const root of state.graph[category].elements) {
        if (!root || typeof root !== 'object' || !root.id) continue;
        const reference = state.unplaced.get(category + '|' + root.id) || String(root.id);
        const info = state.roots.get(category + '|' + reference);
        const kind = info ? info.kind : root.kind;
        const level = info ? info.level : kind;
        roots[category].push(indexElementRecursive(root, kind, reference, info ? info.file : '', category, index, settings, level, null, state.roots));
      }
    }
    for (const category of LAYER_NAMES) {
      for (const record of index[category].values()) {
        record.declaredIn = cache.filePlateau.get(record.sourceFile) || BASELINE_PLATEAU;
        const key = category + '|' + record.reference;
        record.patched = state.patched.get(key) || null;
        record.touchedBy = state.touched.get(key) || [];
      }
    }
    stats = resolveRelationships(index);
    removals = state.removals;
  }
  cache.counters.models++;
  const told = result.fatal ? result.earlier : result.state.problems; // `{ plateau, sentences }` of the first layer of the chain that is wrong, if any
  let problems = told ? told.sentences : result.fatal ? result.fatal : null;
  // the command line reads every manifest before it loads a layer, and stops at the first it refuses: while one is refused, that is the sentence (the elements it
  // cannot declare leave "declared under X, which does not exist" behind, which are its consequences, not other mistakes)
  const unreadable = problems ? AppState.manifestFiles.find((mf) => mf.error) : null;
  if (unreadable) problems = ['`' + unreadable.relPath + '` is not valid: ' + unreadable.error];
  const failedAt = told ? told.plateau : result.fatal ? result.plateau : null;
  const model = { id, plateau: layerPlateauModel(id), index, roots, stats, removals, problems, failedAt, undrawable: !!result.fatal };
  cache.models.set(id, model);
  return model;
}

