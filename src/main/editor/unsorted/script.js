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

/** The sentence for a workspace file that still has the key that listed the plateaus. It is the command line's (`WorkspaceFactory.REMOVED_KEY`), word for word. */
const REMOVED_PLATEAUS_KEY =
  '`settings.plateaus` no longer exists: a plateau is a layer now. Remove the key, write `plateau: <id>` in the header of the manifests of each plateau, ' +
  'and declare each plateau in a manifest of kind `archicode.morin.io/plateau` (`id`, `name`, `override`: the plateau it builds on, `baseline` when absent, ' +
  'and `patches` for what it changes)';

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

// ---- Where a value comes from ----

/**
 * Where a field of an element of the plateau drawn comes from: `{ kind: 'patch', plateau, rank, operator, selector, inherited }` when a patch set it (the last one),
 * else `{ kind: 'declared' | 'inherited', plateau }`, the plateau of the manifest that declares the element. `inherited` is true when that plateau is not the one drawn.
 * Null for a record of a workspace that has no layers.
 */
function fieldOriginOf(record, field, drawn) {
  if (!record || record.declaredIn === undefined) return null;
  const now = drawn || (AppState.layers ? AppState.layers.current : BASELINE_PLATEAU);
  const set = record.patched ? record.patched.get(field) : null;
  if (set) return { kind: 'patch', plateau: set.plateau, rank: set.rank, operator: set.operator, selector: set.selector, inherited: set.plateau !== now };
  return { kind: record.declaredIn === now ? 'declared' : 'inherited', plateau: record.declaredIn, inherited: record.declaredIn !== now };
}

/** The origin as a sentence: `declared in saas`, `inherited from baseline`, `set by patch 3 of saas (SET target shop.web)`, `inherited from inhouse: set by patch 3 ...`. */
function originText(origin) {
  if (!origin) return '';
  if (origin.kind === 'patch') return (origin.operator === 'REMOVE' ? 'taken out by patch ' : 'set by patch ') + origin.rank + ' of ' + origin.plateau + ' (' + origin.operator + ' ' + origin.selector + ')' + (origin.inherited ? ', inherited' : '');
  return origin.kind === 'declared' ? 'declared in ' + origin.plateau : 'inherited from ' + origin.plateau;
}

/** The small note after a value: where it comes from. `forPlateau`: the plateau the record is read in (the plateau drawn when omitted). '' for a workspace that has no layers. */
function originNoteHtml(record, field, forPlateau) {
  const origin = AppState.layers && AppState.plateauTree && AppState.plateauTree.layered ? fieldOriginOf(record, field, forPlateau) : null;
  if (!origin) return '';
  return ' <span class="field-origin" data-origin="' + origin.kind + '" data-field="' + escapeHtml(field) + '" title="' + escapeHtml(originText(origin)) + '">' + escapeHtml(originText(origin)) + '</span>';
}

/** The patches that selected an element without naming a field it sets (a `json-path` that replaces nodes), as lines of the origin block. */
function renderOriginBlockHtml(record, forPlateau) {
  if (!AppState.layers || !AppState.plateauTree || !AppState.plateauTree.layered || record.declaredIn === undefined) return '';
  const now = forPlateau || AppState.layers.current;
  const patches = (record.touchedBy || []).map((t) => '<li>patch ' + t.rank + ' of ' + escapeHtml(t.plateau) + ': ' + escapeHtml(t.operator + ' ' + t.selector) + (t.field ? ' <span class="muted">(' + escapeHtml(t.field) + ')</span>' : '') + '</li>').join('');
  return '<section class="origin-block" aria-label="Origin" data-declared-in="' + escapeHtml(record.declaredIn) + '">' +
    renderFieldRowHtml('Plateau', escapeHtml(record.declaredIn === now ? 'declared in ' + record.declaredIn : 'inherited from ' + record.declaredIn)) +
    (patches ? renderFieldRowHtml('Patches', '<ul class="origin-patches">' + patches + '</ul>', record.touchedBy.length) : '') + '</section>';
}

// ---- The cascade of a REMOVE ----

/**
 * What the REMOVE patches of the chain of the plateau compared took besides the elements they select, among what the other plateau has (`Removal.cascade`):
 * the elements that left with the selected ones, then the entries taken out of the elements that stay. `[{ plateau, rank, patch, effect, layer, element, detail }]`.
 * `base`: the index of the plateau the target is compared with.
 */
function cascadeOf(removals, base) {
  const out = [];
  for (const removal of removals) {
    const patch = removal.operator + ' ' + removal.selector;
    const selected = new Set((removal.touched || []).map((r) => r.layer + '|' + r.reference));
    const gone = (removal.removed || [])
      .filter((r) => !selected.has(r.layer + '|' + r.reference) && base[r.layer] && base[r.layer].has(r.reference))
      .sort((a, b) => compareUnits(a.layer, b.layer) || compareUnits(a.reference, b.reference));
    for (const r of gone) out.push({ plateau: removal.plateau, rank: removal.rank, patch, effect: 'removed', layer: r.layer, element: r.reference, detail: '' });
    const dropped = [];
    for (const d of removal.dropped || []) {
      const holder = base[d.layer] ? base[d.layer].get(d.reference) : null;
      if (!holder) continue;
      const entry = d.entry && typeof d.entry === 'object' ? d.entry : null;
      const destination = entry ? String(entry.destination) : String(d.entry);
      const label = entry && entry.label !== undefined && entry.label !== null ? String(entry.label) : null;
      let held = false;
      if (d.field === 'relationships') held = holder.relationships.some((r) => String(r.destination) === destination && (r.rawLabel === null || r.rawLabel === undefined ? '' : String(r.rawLabel)) === (label === null ? '' : label));
      else if (d.field === 'uses') held = holder.kind === 'environment' && kernelStringsOf(holder.uses).includes(destination);
      else if (d.field === 'applications') held = holder.kind === 'node' && kernelStringsOf(holder.applications).includes(destination);
      if (held) dropped.push({ layer: d.layer, holder: d.reference, field: d.field, text: destination + (label === null ? '' : ' (' + label + ')') });
    }
    dropped.sort((a, b) => compareUnits(a.layer, b.layer) || compareUnits(a.holder, b.holder) || compareUnits(a.field, b.field) || compareUnits(a.text, b.text));
    for (const d of dropped) out.push({ plateau: removal.plateau, rank: removal.rank, patch, effect: 'dropped', layer: d.layer, element: d.holder, detail: d.field + ': ' + d.text });
  }
  return out;
}

// =====================================================================
// The band of plateaus (wave 014, run 0080; read-only and on the pages of Timeline only since wave 015, run 0097). The state it chooses is `AppState.layers`: the plateau drawn
// (the whole editor draws it: `AppState.index` is its resolved model) and the comparison (`AppState.baseline` is the plateau compared with, the machinery of run 0039).
// The comparison is the past (the plateau it overrides), the future (the plateau that overrides it; the band lists each when there are several) or any other plateau.
// =====================================================================

/**
 * The layers of the workspace on screen: `{ current, compare, blocked }`, or null while no workspace is open.
 * `current`: the id of the plateau drawn. `compare`: null, or `{ mode, other, chosen }`: `mode` is `past` (`other` is the plateau it overrides: the base), `future`
 * (`other` is a plateau that overrides it: the target; null while the band waits for the choice) or `other` (any other plateau: the base); `chosen` says that the
 * target was picked on the band. `blocked`: null, or why only `baseline` is drawn (a mistake in the tree, a reference declared twice).
 */
function createLayers(current, compare) {
  return { current: current || BASELINE_PLATEAU, compare: compare || null, blocked: null };
}

/** Why the plateaus other than baseline are not drawn, or null: the tree has a mistake, or a reference is declared twice (the command line refuses the workspace). */
function layersBlockedReason() {
  const tree = AppState.plateauTree;
  if (!tree || !tree.layered) return null;
  if (tree.problems.length) return tree.problems.length === 1 ? 'The plateaus have a mistake (see the note in Elements or Files), so only baseline is drawn.' : 'The plateaus have ' + tree.problems.length + ' mistakes (see the note in Elements or Files), so only baseline is drawn.';
  if ((tree.redeclared || []).length) return 'A reference is declared again in a plateau that overrides the one that declares it (see the note in Elements or Files), so only baseline is drawn.';
  if (elementDuplicates().length) return 'A reference is declared twice (see the note in Elements or Files), so only baseline is drawn.';
  return null;
}

/** The ancestors of a plateau, nearest first. */
function layerAncestorsOf(id) {
  const out = [];
  const nodes = AppState.plateauTree.nodes;
  for (let at = nodes.get(id); at && at.parent !== null; at = nodes.get(at.parent)) out.push(at.parent);
  return out;
}

/** The plateaus that override a plateau directly, in the order of the band. */
function layerChildrenOf(id) {
  return Array.from(AppState.plateauTree.nodes.values()).filter((n) => n.parent === id).sort(compareBandSiblings).map((n) => n.id);
}

/** Whether a plateau is below another in the tree (it overrides it, directly or not). */
function layerIsBelow(id, ancestor) {
  return layerAncestorsOf(id).includes(ancestor);
}

/**
 * The comparison after the plateau drawn changed (or the tree did): `past` follows the plateau it overrides, `future` follows the one that overrides it (waiting for the
 * choice when there are several, keeping a target picked on the band while it is still below), `other` stays while it is another plateau. Nothing when nothing is left to compare.
 */
function normalizedLayerCompare(layers) {
  const c = layers.compare;
  if (!c) return null;
  const tree = AppState.plateauTree;
  if (c.mode === 'past') {
    const node = tree.nodes.get(layers.current);
    return node && node.parent !== null ? { mode: 'past', other: node.parent, chosen: false } : null;
  }
  if (c.mode === 'future') {
    if (c.chosen && c.other && tree.nodes.has(c.other) && layerIsBelow(c.other, layers.current)) return c;
    const children = layerChildrenOf(layers.current);
    if (!children.length) return null;
    return { mode: 'future', other: children.length === 1 ? children[0] : null, chosen: false };
  }
  if (!c.other || c.other === layers.current || !tree.nodes.has(c.other)) return null;
  // a plateau chosen on the band is read as it stands to the plateau drawn now: the future when it overrides it, the past when it is the plateau it overrides, whichever way it was reached
  if (layerIsBelow(c.other, layers.current)) return { mode: 'future', other: c.other, chosen: true };
  if (tree.nodes.get(layers.current).parent === c.other) return { mode: 'past', other: c.other, chosen: false };
  return { mode: 'other', other: c.other, chosen: true };
}

/**
 * The plateau compared with, as a plateau of the page, or null (nothing compared, or the band still waits for the choice of the future). `layers`: the band's state it is read in, the
 * editor's (`AppState.layers`) unless a scene of the story player asks for the one of a step (`drawingOfPlateaus`).
 */
function layerCompareOther(layers = AppState.layers) {
  if (!layers || !layers.compare || !layers.compare.other || layers.compare.other === layers.current || !AppState.plateauTree.nodes.has(layers.compare.other)) return null;
  return layerPlateauModel(layers.compare.other);
}

/** The comparison is with the future: the plateau drawn is the base and the other one the target. `layers` as for `layerCompareOther`. */
function layerCompareIsFuture(layers = AppState.layers) {
  return !!(layers && layers.compare && layers.compare.mode === 'future' && layerCompareOther(layers));
}

/**
 * Make `AppState` hold what the band says: the model of the plateau drawn is `AppState.index` (with its roots and its relationships), the plateau compared with is
 * `AppState.baseline`. Resolves what is not resolved yet (see `layerModelOf`); a workspace that is not layered, or whose plateaus cannot be drawn (`blocked`), keeps the
 * index of `buildIndex`, which holds the manifests of baseline.
 */
function syncLayers() {
  const layers = AppState.layers;
  if (!layers || !AppState.workspace) return;
  const tree = AppState.plateauTree;
  layers.blocked = layersBlockedReason();
  AppState.layerProblems = null;
  AppState.layerUndrawable = false;
  if (!tree || !tree.layered || layers.blocked) {
    layers.current = BASELINE_PLATEAU;
    layers.compare = null;
    AppState.baseline = null;
    modelsChanged();
    return;
  }
  if (!tree.nodes.has(layers.current)) layers.current = BASELINE_PLATEAU;
  layers.compare = normalizedLayerCompare(layers);
  const settings = AppState.workspace.settings;
  const model = layerModelOf(layers.current, settings);
  const other = layerCompareOther();
  const otherModel = other ? layerModelOf(other.id, settings) : null;
  AppState.index = model.index;
  AppState.baseline = other ? { plateau: other, index: otherModel.index, problem: otherModel.problems ? otherModel.problems.join('\n') : null, undrawable: otherModel.undrawable } : null;
  modelsChanged();
  AppState.workspace.application.elements = model.roots.application;
  AppState.workspace.technology.elements = model.roots.technology;
  AppState.relationshipStats = model.stats;
  AppState.layerProblems = model.problems;
  AppState.layerUndrawable = model.undrawable;
}

/**
 * Draw the plateau of a node of the band. The folder is not read again and nothing is lost: the manifests stay what they are, the model drawn is another resolution of them.
 * `options.compare` (wave 015, run 0096, W-8, #91) is the comparison an address names, as `layerCompareChoice` writes it (`past`, `future:<id>`, `other:<id>`, empty for none):
 * it is set with the plateau, in one drawing. `options.fromAddress` says the change comes from the address (typed, or Back): the address already says it, so no entry
 * is added to the history and the page is not drawn here, the caller does it (`syncPerspectiveFromHash`). Returns whether anything changed.
 */
function drawPlateau(id, options) {
  const layers = AppState.layers;
  const compare = options && typeof options.compare === 'string' ? options.compare : null;
  if (!layers || !AppState.workspace || !AppState.plateauTree || !AppState.plateauTree.nodes.has(id) || layers.blocked) return false;
  const before = layers.current + '|' + layerCompareChoice();
  layers.current = id;
  if (compare !== null) layers.compare = layerCompareFromChoice(compare);
  layers.compare = normalizedLayerCompare(layers);
  if (layers.current + '|' + layerCompareChoice() === before) return false;
  rememberLayerChoice();
  if (options && options.fromAddress) settleAfterLayerChange(false);
  else settleAfterLayerChange();
  return true;
}

/**
 * Wave 015 (run 0096, W-8, #91): an address typed while the editor is open (or reached by Back and Forward) draws the plateau and the comparison it names, as the band
 * does, through `drawPlateau`: nothing is read from the disk and nothing is lost. The address is the whole say of the plateau: one that names none is the root (that is
 * what the page writes for it, so Back to such an address draws it), one that names a plateau that does not exist leaves the plateau drawn (the page writes its own
 * address back). `compare=` is read when the address has it (the page writes it with a removed element; a typed or kept link may carry it): empty is no comparison.
 * A write in flight, or a dialog that is open (a form of a plateau, the question of a write that other plateaus inherit), keeps the plateau it was opened in: the address is
 * not followed and the page writes back the address of what is drawn. Returns whether anything was drawn again.
 */
function drawLayersNamedByAddress() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !AppState.workspace || !tree || !tree.layered || layers.blocked || saveInFlight || appDialog) return false;
  const named = plateauFromHash();
  const id = named === null ? BASELINE_PLATEAU : named;
  if (!tree.nodes.has(id)) return false;
  const compare = compareFromHash();
  return drawPlateau(id, { compare: compare === null ? undefined : compare, fromAddress: true });
}

/** Whether the next address the page writes is a new entry of the history: a plateau or a comparison the author chose is, a rewrite of what the address means is not. */
let layerChangeIsAnEntry = false;

/**
 * After another plateau is drawn or another comparison is chosen: the page is drawn again from the new models, and what it held that is not in them is let go.
 * `draw` false: the caller draws (an address; see `drawPlateau`). Otherwise the change is a step of the author: the address it makes is an entry of the history, so that Back returns to the plateau before.
 */
function settleAfterLayerChange(draw = true) {
  layerChangeIsAnEntry = draw;
  syncLayers();
  const selection = AppState.selection;
  if (selection.kind === 'element') {
    if (selection.mode === 'edit') selection.mode = 'view';
    const layer = selection.layer || layerOfReference(selection.key, selection.layer);
    if (!layer || !AppState.index[layer] || !AppState.index[layer].has(selection.key)) AppState.selection = { kind: 'none', key: null, mode: 'view' };
  } else if (selection.kind === 'link' || selection.kind === 'create') {
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
  }
  pendingDeleteConfirmation = null;
  removedPick = null;
  changesTabPick = null;
  candidateMessage = null;
  mapSelectionCheck = true;
  diagramCache = null;
  if (draw) {
    try {
      render();
    } finally {
      layerChangeIsAnEntry = false; // a render that showed no shell (or failed) did not write the address: the next one is not this change
    }
  }
}

/** The Past toggle: compare the plateau drawn with the plateau it overrides, or stop. Nothing for `baseline`, which overrides nothing. */
function toggleCompareWithPast() {
  const layers = AppState.layers;
  if (!layers || layers.blocked || !AppState.plateauTree.nodes.has(layers.current)) return;
  if (layers.compare && layers.compare.mode === 'past') layers.compare = null;
  else if (AppState.plateauTree.nodes.get(layers.current).parent !== null) layers.compare = { mode: 'past', other: AppState.plateauTree.nodes.get(layers.current).parent, chosen: false };
  else return;
  rememberLayerChoice();
  settleAfterLayerChange();
}

/**
 * The Future toggle: compare the plateau drawn with the plateau that overrides it, or stop. With several plateaus on top of it the choice is made on the band
 * (`compareWithPlateau` on one of them); until then the band says so and nothing is compared.
 */
function toggleCompareWithFuture() {
  const layers = AppState.layers;
  if (!layers || layers.blocked) return;
  if (layers.compare && layers.compare.mode === 'future') layers.compare = null;
  else if (layerChildrenOf(layers.current).length) layers.compare = { mode: 'future', other: null, chosen: false };
  else return;
  layers.compare = normalizedLayerCompare(layers);
  rememberLayerChoice();
  settleAfterLayerChange();
}

/**
 * Compare the plateau drawn with any other plateau of the band. One that the drawn plateau overrides is the past, one that overrides it is the future (the target,
 * picked on the band), any other (a sibling, a cousin) is the base the drawn plateau is compared with, as `archicode diff --plateau <drawn> --against <id>`.
 * The same node again stops the comparison.
 */
function compareWithPlateau(id) {
  const layers = AppState.layers;
  if (!layers || layers.blocked || !AppState.plateauTree.nodes.has(id)) return;
  const node = AppState.plateauTree.nodes.get(layers.current);
  if (id === layers.current || (layers.compare && layers.compare.other === id)) {
    layers.compare = null;
  } else if (layerIsBelow(id, layers.current)) {
    layers.compare = { mode: 'future', other: id, chosen: true };
  } else if (id === node.parent) {
    layers.compare = { mode: 'past', other: id, chosen: false };
  } else {
    layers.compare = { mode: 'other', other: id, chosen: true };
  }
  rememberLayerChoice();
  settleAfterLayerChange();
}

/** What is remembered for this folder in this browser: the plateau drawn, and the comparison as `past`, `future`, `future:<id>`, `other:<id>` or empty. */
function layerCompareChoice() {
  const c = AppState.layers && AppState.layers.compare;
  if (!c) return '';
  if (c.mode === 'past') return 'past';
  return c.mode + (c.chosen && c.other ? ':' + c.other : '');
}

function rememberLayerChoice() {
  if (!AppState.layers) return;
  rememberPlateauId(AppState.layers.current);
  rememberComparison(layerCompareChoice());
}

/** A remembered or addressed comparison as `{ mode, other, chosen }`, or null when it says nothing the tree can honour. */
function layerCompareFromChoice(choice) {
  if (typeof choice !== 'string' || choice === '') return null;
  const [mode, other] = [choice.split(':')[0], choice.includes(':') ? choice.slice(choice.indexOf(':') + 1) : null];
  if (mode === 'past') return { mode: 'past', other: null, chosen: false };
  if (mode === 'future') return { mode: 'future', other, chosen: !!other };
  if (mode === 'other' && other) return { mode: 'other', other, chosen: true };
  return null;
}

/** What makes a plateau, said wherever a workspace has none and is asked for one (`WorkspaceFactory.NO_PLATEAU`). */
const NO_PLATEAU = ' (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)';

/** `settings.current` when it names no plateau of the layers: the sentence of the command line (`WorkspaceFactory.chosen`, `noPlateausProblems`), else null. */
function layersOfSettingsCurrentProblem(current, tree) {
  if (!tree.layered) return '`settings.current` is `' + current + '` but the workspace declares no plateau' + NO_PLATEAU;
  if (tree.problems.length || tree.nodes.has(current)) return null;
  return '`settings.current` names the plateau `' + current + '`, which is not a plateau of this workspace (the plateaus are ' + tree.ids.map((id) => '`' + id + '`').join(', ') + ')';
}

/** The plateau the address names (`plateau=`), or null. */
function plateauFromHash() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1) return null;
  return new URLSearchParams(location.hash.slice(queryIdx + 1)).get('plateau');
}

/**
 * The band: the plateau drawn is the one the address names, else the one this browser last drew in this folder, else
 * `settings.current`, else `baseline` (the command line asks for a name when the plateaus fork; the editor starts from the root, where it can edit); the comparison is the
 * one of the address, else the one this browser last chose. The kernel is loaded first when there are layers to resolve, since the patches are applied by it.
 */
async function openLayers(settings, tree) {
  const known = (id) => !!id && tree.layered && !tree.problems.length && tree.nodes.has(id);
  const current = [plateauFromHash(), recalledPlateauId(), settings.current === '' ? null : settings.current].find(known) || BASELINE_PLATEAU;
  const fromAddress = compareFromHash();
  AppState.layers = createLayers(current, layerCompareFromChoice(fromAddress !== null ? fromAddress : recalledComparison()));
  if (tree.layered && !layersBlockedReason()) {
    try {
      await loadViewpointKernel();
    } catch (e) {
      console.error('ArchiCode: the viewpoint kernel could not be loaded, the patches of the plateaus are not applied', e);
    }
  }
  syncLayers();
  if (fromAddress !== null && AppState.layers.compare) rememberLayerChoice(); // an address that names a comparison the plateaus can honour is a choice made (run 0040): it wins over what this browser had, and is kept like it
}

// ---- What each node says: the changes it brings over the plateau it overrides ----

/** The counts of a plateau compared with its parent (`{ elements: { new, changed, removed }, relationships }`), or null for the root, a plateau that cannot be drawn, or before the kernel is loaded. Kept with the models. */
function layerNodeCounts(id) {
  const settings = AppState.workspace.settings;
  const node = AppState.plateauTree.nodes.get(id);
  if (!node || node.parent === null || !loadedKernel) return null;
  const cache = ensureLayerCache(settings);
  if (!cache.counts) cache.counts = new Map();
  if (cache.counts.has(id)) return cache.counts.get(id);
  const target = layerModelOf(id, settings);
  const base = layerModelOf(node.parent, settings);
  let counts = null;
  if (!target.problems && !base.problems) {
    const answer = loadedKernel.compare(comparisonInputBetween(base.index, target.index, true)); // a plateau and the one it overrides: a chain
    if (!answer.error) counts = answer.counts;
  }
  cache.counts.set(id, counts);
  return counts;
}

/** The counts of a plateau if they were computed (null: they cannot be, undefined: not yet), without computing them. */
function cachedNodeCounts(id) {
  const cache = AppState.workspace ? ensureLayerCache(AppState.workspace.settings) : null;
  return cache && cache.counts && cache.counts.has(id) ? cache.counts.get(id) : undefined;
}

/** Compute the counts of the plateaus that have none yet, one per turn of the event loop, and write them in the page Plateaus as they come (a big tree does not hold the first drawing). Only while that page is on screen (wave 015, run 0097: the band no longer says them). */
let bandCountsTimer = null;
function schedulePlateauCounts() {
  if (bandCountsTimer !== null || currentPerspective !== 'plateaus' || !AppState.layers || !loadedKernel || !AppState.plateauTree || !AppState.plateauTree.layered || AppState.layers.blocked) return;
  const settings = AppState.workspace.settings;
  const missing = () => {
    const cache = ensureLayerCache(settings);
    return AppState.plateauTree.ids.filter((id) => AppState.plateauTree.nodes.get(id).parent !== null && !(cache.counts && cache.counts.has(id)));
  };
  if (!missing().length) return;
  bandCountsTimer = setTimeout(function step() {
    bandCountsTimer = null;
    if (currentPerspective !== 'plateaus' || !AppState.layers || !AppState.workspace || !AppState.plateauTree || !AppState.plateauTree.layered || AppState.layers.blocked) return;
    const next = missing()[0];
    if (next === undefined) return;
    layerNodeCounts(next);
    if (typeof document !== 'undefined' && document.querySelectorAll) {
      // the Plateaus page, when it is on screen, has the same counts in its entries
      for (const holder of Array.from(document.querySelectorAll('.timeline-item .timeline-changes'))) {
        const item = holder.closest('.timeline-item');
        const id = item ? item.getAttribute('data-plateau') : null;
        if (id && AppState.plateauTree.nodes.has(id) && AppState.plateauTree.nodes.get(id).parent !== null && cachedNodeCounts(id) !== undefined && /Counting/.test(holder.textContent)) holder.innerHTML = timelineChangesHtml(id);
      }
    }
    if (missing().length) bandCountsTimer = setTimeout(step, 0);
  }, 0);
}

// ---- The band ----
//
// Wave 015 (run 0097, W-9, #98): the band chooses the plateau drawn and the plateau compared with, on the pages of the perspective Timeline, and does nothing else.
// Two lists, one row: "Plateau" (every plateau of the tree, indented by its depth) and "Compare with" (nothing, the past that follows the plateau drawn, then the same tree, the plateau drawn greyed in it; wave 016, run 0109), then, only when
// there is one, a button that opens the mistakes of the plateaus. What the tree of buttons held moved to where it belongs: the tree and the counts of each plateau are on the
// page Plateaus, the sentence that said what is compared is the Changes panel's (and the list says it), Everything / Changes only is among the tools of the diagram, and the
// mistakes are behind the button. The state is `AppState.layers`, not the band's: the band is not drawn on Stories, Files and Settings, and nothing is reset there.

/** The band is on screen: a workspace is open, it has layers, and the page is one of the perspective Timeline. */
function bandIsShown() {
  return !!(AppState.workspace && !AppState.fatalError && AppState.layers && AppState.plateauTree && PERSPECTIVES[currentPerspective].group === 'timeline');
}

/** The sentences of the first layer of the chain of a plateau that the command line refuses, or null (resolves the plateau if it was not: a click on its node would). */
function layerModelBroken(id) {
  if (!AppState.layers || AppState.layers.blocked || !AppState.plateauTree.layered) return null; // a workspace with no layer has the one plateau, drawn from its manifests
  return layerModelOf(id, AppState.workspace.settings).problems;
}

/** The text of a plateau in a list of the band: its name (else its id) and its horizon, a `!` before it when the command line refuses it. */
function bandPlateauLabel(id) {
  const node = AppState.plateauTree.nodes.get(id);
  return (layerModelBroken(id) ? '! ' : '') + plateauTitle(layerPlateauModel(id)) + (node && node.horizon ? ' · ' + node.horizon : '');
}

/** One step of indentation in the lists of the band: an em space (U+2003), which an `<option>` keeps (only ASCII white space at the start of an option's text is collapsed). */
const BAND_INDENT = '\u2003';

function bandOptionHtml(value, label, selected, extra) {
  return '<option value="' + escapeHtml(value) + '"' + (selected ? ' selected' : '') + (extra || '') + '>' + escapeHtml(label) + '</option>';
}

/** The list "Plateau": every plateau in the order of the tree, each indented by its depth; the one drawn is selected. */
function bandPlateauSelectHtml(root, disabled) {
  const layers = AppState.layers;
  const options = [];
  const walk = (item, depth) => {
    options.push(bandOptionHtml(item.id, BAND_INDENT.repeat(Math.min(depth, 6)) + bandPlateauLabel(item.id), item.id === layers.current));
    item.children.forEach((child) => walk(child, depth + 1));
  };
  walk(root, 0);
  const node = AppState.plateauTree.nodes.get(layers.current);
  return '<label class="band-field"><span class="plateau-label" id="band-plateau-label">Plateau</span>' +
    '<select id="band-plateau" data-band-select="plateau" aria-labelledby="band-plateau-label"' + (disabled ? ' disabled' : '') + ' title="The plateau drawn in the whole editor' + (node && node.parent !== null ? ' (it overrides ' + escapeHtml(node.parent) + ')' : '') + '">' + options.join('') + '</select></label>';
}

/**
 * The list "Compare with" (wave 016, run 0109, W-3, #72): nothing; the past, which follows the plateau drawn (the plateau it overrides, whichever that is); then the tree of the
 * plateaus, the same as the list "Plateau" (every plateau in the order of the tree, indented by its depth, the same labels), where the plateau drawn is greyed (disabled) in its
 * place, so that the hierarchy can be read in both lists. A plateau of the tree is a fixed comparison, as `archicode diff --plateau <drawn> --against <id>`. A future the address
 * asked for with several plateaus on top of the drawn one is told as a choice still to make (a first entry, disabled and selected, with the tree under it and nothing selected in it);
 * with one plateau on top of it, the entry of that plateau is the one selected.
 */
function bandCompareSelectHtml(root, disabled) {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  const node = tree.nodes.get(layers.current);
  const parent = node && node.parent !== null ? node.parent : null;
  const listing = !layers.blocked; // a write in flight disables the list, it does not change what it says; blocked plateaus have nothing to choose from
  const compare = layers.compare;
  const other = layerCompareOther();
  let selected = '';
  if (compare && !other && compare.mode === 'future') selected = 'future'; // waiting for the choice of the future
  else if (other) selected = compare.mode === 'past' && !compare.chosen ? 'past' : 'plateau:' + other.id;
  let html = bandOptionHtml('', 'Nothing', selected === '');
  if (selected === 'future') html += bandOptionHtml('future', 'Choose a future plateau', true, ' disabled');
  if (parent !== null && listing) html += bandOptionHtml('past', 'Past (follows the plateau drawn)', selected === 'past');
  if (listing) {
    const walk = (item, depth) => {
      html += bandOptionHtml('plateau:' + item.id, BAND_INDENT.repeat(Math.min(depth, 6)) + bandPlateauLabel(item.id), selected === 'plateau:' + item.id, item.id === layers.current ? ' disabled' : '');
      item.children.forEach((child) => walk(child, depth + 1));
    };
    walk(root, 0);
  }
  return '<label class="band-field"><span class="plateau-label" id="band-compare-label">Compare with</span>' +
    '<select id="band-compare" data-band-select="compare" aria-labelledby="band-compare-label"' + (disabled ? ' disabled' : '') + ' title="What the plateau drawn is compared with: the Changes panel lists what differs. The plateau drawn is greyed in the tree.">' + html + '</select></label>';
}

/**
 * The mistakes of the plateaus the page knows of, as sections `{ heading, lines }` (the heading may be null): why only baseline is drawn, the sentences of the first layer of the
 * chain of the plateau drawn that the command line refuses, and the same for the plateau it is compared with. `note` is the one thing said without being counted: why nothing is written.
 */
function bandMistakes() {
  const layers = AppState.layers;
  const sections = [];
  if (layers.blocked) sections.push({ heading: 'Only baseline is drawn:', lines: [layers.blocked] });
  if (AppState.layerProblems) {
    const name = plateauTitle(layerPlateauModel(layers.current));
    sections.push({ heading: AppState.layerUndrawable ? name + ' cannot be drawn.' : name + ' is drawn, and the command line refuses it:', lines: AppState.layerProblems });
  }
  if (AppState.baseline && AppState.baseline.problem) {
    const name = plateauTitle(AppState.baseline.plateau);
    sections.push({ heading: AppState.baseline.undrawable ? name + ', which the drawing is compared with, cannot be drawn.' : name + ', which the drawing is compared with, is refused by the command line:', lines: AppState.baseline.problem.split('\n') });
  }
  // not a mistake of a plateau: a view or a story names an element that no plateau has (wave 015, run 0100); told whatever plateau is drawn
  // the steps of a story that name a plateau that is none are told apart from the names (run 0101): a workspace with no plateau has them too
  const entries = entryProblemsOf(AppState.workspace.settings);
  const names = entries.filter((line) => line.endsWith(', which exists in no plateau'));
  const steps = entries.filter((line) => !names.includes(line));
  if (names.length) sections.push({ heading: 'The views and the stories name elements that no plateau has:', lines: names });
  if (steps.length) sections.push({ heading: 'The steps of the stories name plateaus that are none:', lines: steps });
  return { sections, count: sections.reduce((n, section) => n + section.lines.length, 0), note: readOnlyPlateauMessage() };
}

/** The body of the dialog of the mistakes (the band's button opens it): the sections of `bandMistakes`, read from the state each time the page is drawn. */
function renderMistakesDialogBodyHtml() {
  const mistakes = AppState.layers ? bandMistakes() : { sections: [], count: 0, note: null };
  if (!mistakes.count) return '<p>No mistake in the plateaus.</p>';
  return mistakes.sections.map((section) => '<section class="band-errors">' + (section.heading ? '<strong>' + escapeHtml(section.heading) + '</strong>' : '') +
    '<ul>' + section.lines.map((line) => '<li>' + duplicateMessageHtml(line) + '</li>').join('') + '</ul></section>').join('') +
    (mistakes.note ? '<p class="band-readonly">' + duplicateMessageHtml(mistakes.note) + '</p>' : '');
}

/** The band: the plateau drawn and what it is compared with, and, when there are some, the button of the mistakes. Nothing while no workspace is open. */
function renderPlateauBandHtml() {
  const layers = AppState.layers;
  if (!layers || !AppState.workspace || !AppState.plateauTree) return '';
  const tree = AppState.plateauTree;
  const root = bandTreeOf(tree) || { id: BASELINE_PLATEAU, node: { id: BASELINE_PLATEAU, name: null, horizon: null, parent: null }, children: [] };
  const disabled = !!layers.blocked || saveInFlight;
  const mistakes = bandMistakes();
  return '<nav class="plateau-band col-span-3" id="plateau-band" aria-label="Plateaus">' +
    bandPlateauSelectHtml(root, disabled) + bandCompareSelectHtml(root, disabled) +
    (mistakes.count ? '<button type="button" class="band-mistakes" data-action="open-mistakes" title="' + escapeHtml(mistakes.sections[0].lines[0]) + '">' +
      '<span class="band-flag" aria-hidden="true">!</span> ' + mistakes.count + (mistakes.count === 1 ? ' mistake' : ' mistakes') + '</button>' : '') +
    '</nav>';
}

/**
 * The controls of the plateaus (wave 014, run 0082; the page Plateaus, wave 015, run 0096, W-8, #99): "writing in: <plateau>" says the plateau drawn is the one a write goes to
 * (when the workspace has layers), the buttons make a plateau that overrides it, and rename it, give it a horizon or another parent. They are on the page Plateaus and nowhere
 * else: the band does not write.
 */
function plateauWritingHtml() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !tree || layers.blocked) return '';
  const id = layers.current;
  const title = plateauTitle(layerPlateauModel(id));
  const writing = writingPlateau();
  const busy = saveInFlight ? ' disabled' : '';
  return '<span class="band-writing">' +
    (writing !== null ? '<span class="band-writing-label" role="status">writing in: <strong>' + escapeHtml(title) + '</strong>' + (title !== id ? ' <code>' + escapeHtml(id) + '</code>' : '') + '</span>' : '') +
    '<button type="button" data-action="plateau-create" data-plateau="' + escapeHtml(id) + '"' + busy + ' title="Create a plateau that overrides ' + escapeHtml(title) + '">New plateau</button>' +
    (tree.layered ? '<button type="button" data-action="plateau-edit" data-plateau="' + escapeHtml(id) + '"' + busy + ' title="Rename ' + escapeHtml(title) + ', give it a horizon or another parent">Edit plateau</button>' : '') +
    (tree.layered && id !== BASELINE_PLATEAU ? plateauDeleteButtonHtml(id, 'Delete plateau', busy) : '') +
    '</span>';
}

/** The button that opens the dialog of the delete (run 0102): offered for every plateau but the root; for one that others override (run 0132, #112) the dialog also says what they lose. */
function plateauDeleteButtonHtml(id, label, busy) {
  const children = layerChildrenOf(id);
  const title = 'Delete ' + plateauTitle(layerPlateauModel(id)) + ' and its files, after a list of what goes' +
    (children.length ? ' and of what ' + (children.length === 1 ? children[0] + ', which overrides it, loses' : children.join(', ') + ', which override it, lose') + ' (' + (children.length === 1 ? 'it goes' : 'they go') + ' under ' + AppState.plateauTree.nodes.get(id).parent + ')' : '');
  return '<button type="button" class="btn-danger" data-action="plateau-delete" data-plateau="' + escapeHtml(id) + '"' + busy + ' title="' + escapeHtml(title) + '">' + escapeHtml(label) + '</button>';
}

/**
 * What a change of one of the two lists of the band does: draw the plateau, or compare. The lists are the band's way to say it, the functions are the ones the page, the address
 * and the tests use (`drawPlateau`, `toggleCompareWithPast`, `toggleCompareWithFuture`, `compareWithPlateau`). A refusal (a form that was typed in and not kept, a write in flight,
 * a plateau that cannot be drawn) puts the list back as it was.
 */
function chooseOnBand(select) {
  const layers = AppState.layers;
  const value = select.value;
  const kind = select.getAttribute('data-band-select');
  if (!layers || !AppState.plateauTree || layers.blocked || saveInFlight || (draftTyped && !confirmDiscardingDraft())) {
    restoreBandLists();
    return;
  }
  const compare = layers.compare;
  let changed = true;
  if (kind === 'plateau') changed = drawPlateau(value);
  else if (value === '') {
    if (compare) {
      layers.compare = null;
      rememberLayerChoice();
      settleAfterLayerChange();
    }
  } else if (value === 'past') {
    if (!compare || compare.mode !== 'past') toggleCompareWithPast();
  } else if (value === 'future') { // not an entry a person can choose since run 0109 (the one entry of that value is disabled); kept for a script and for the tests
    if (!compare || compare.mode !== 'future') toggleCompareWithFuture();
  } else if (value.indexOf('plateau:') === 0) {
    const id = value.slice('plateau:'.length);
    // a list chooses, it does not toggle: the plateau the drawing is compared with already (the past that follows the plateau drawn is one) is not pressed twice
    if (id === layers.current || (compare && compare.other === id)) changed = false;
    else compareWithPlateau(id);
  }
  if (!changed) restoreBandLists();
}

/** Puts the two lists of the band back on what the state says, without drawing the page again: what was typed in a form of the page stays where it is. */
function restoreBandLists() {
  const band = typeof document !== 'undefined' ? document.getElementById('plateau-band') : null;
  if (!band || !AppState.layers) return;
  const holder = document.createElement('template');
  holder.innerHTML = renderPlateauBandHtml();
  if (holder.content && holder.content.firstElementChild) band.replaceWith(holder.content.firstElementChild);
}

/** The form of a plateau: a new one that overrides `id` (`create`), or `id` itself (`edit`). */
function openPlateauDialog(mode, id) {
  const tree = AppState.plateauTree;
  if (!AppState.layers || !tree || AppState.layers.blocked) return;
  if (mode === 'edit') {
    const node = tree.nodes.get(id);
    if (!node) return;
    openAppDialog({ kind: 'plateau-form', mode, plateau: id, values: { id, name: node.name || '', horizon: node.horizon || '', parent: node.parent === null ? '' : node.parent } });
  } else {
    openAppDialog({ kind: 'plateau-form', mode: 'create', plateau: null, values: { id: '', name: '', horizon: '', parent: tree.nodes.has(id) ? id : BASELINE_PLATEAU } });
  }
}

// ---- Writing in a layer (wave 014, run 0082, W-8) ----
//
// A write goes to the plateau drawn ("writing in: <plateau>" on the page Plateaus), in the file of that plateau and nowhere else:
//   - a new element is a manifest whose header says `plateau: <the plateau>` (none for baseline, the default); a new view or story belongs to no plateau and says none (run 0100);
//   - a field of an element the plateau declares is edited in the manifest that declares it, as before;
//   - a field of an element the plateau inherits is a patch of the plateau (`SET`, `ADD` or `MERGE`, see `patchFor`), found again by (target, field) so that a second
//     edit of the same field changes that patch and does not add another;
//   - an element the plateau inherits is removed by a `REMOVE` patch (the cascade is the kernel's);
//   - a plateau is created, renamed, given a horizon or another parent in its manifest of kind `archicode.morin.io/plateau`.
// Every one of these runs under `guardedLayerWrite`: the plateaus are resolved again, and the write is kept only if the plateau written gives back the value that was edited,
// no plateau that resolved before is refused now, and, when other plateaus inherit what was written, the author said yes (a plateau with descendants asks first and lists them).
// A workspace that is not layered (`writingPlateau()` is null) does not go through any of it and saves exactly as before.

/** The plateau a write goes to: the plateau drawn, when the workspace is layered and its plateaus are drawn. Null otherwise (the old rules apply and nothing here runs). */
function writingPlateau() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !tree || !tree.layered || layers.blocked || !tree.nodes.has(layers.current)) return null;
  return layers.current;
}

/** Why nothing is written while this plateau is drawn, or null: the kernel refused its patches, so there is no graph to edit. */
function readOnlyPlateauMessage() {
  const plateau = writingPlateau();
  if (plateau === null || !AppState.layerUndrawable) return null;
  return 'The plateau `' + plateau + '` cannot be drawn, so nothing is written in it: repair its patches in Files first.';
}

/** Why a click that writes an element is not done, or null: the plateau cannot be drawn. A view and a story belong to no plateau, so nothing here concerns them. */
function layerActionRefusal() {
  return readOnlyPlateauMessage();
}

/** Throws the sentence of `readOnlyPlateauMessage` when the plateau drawn cannot be written. Every writer of an element starts with it. */
function requireWritablePlateau() {
  const message = readOnlyPlateauMessage();
  if (message) throw new Error(message);
}

/**
 * Whether a write in the plateau drawn may rewrite this file: it belongs to the plateau drawn or to one that stands on it (a rename, a delete, a move reach what points
 * at the element, and only those files can). A plateau beside it may declare an element with the same reference, which is another element. True for a workspace that is
 * not layered and for baseline (every plateau stands on it).
 */
function writeScopeHas(mf) {
  const plateau = writingPlateau();
  if (plateau === null || plateau === BASELINE_PLATEAU) return true;
  if (!mf || !mf.header) return false;
  const owner = manifestKindName(mf.header.kind) === 'plateau' && mf.content ? String(mf.content.id) : plateauOfManifest(mf);
  return owner === plateau || layerIsBelow(owner, plateau);
}

/** A sentence on one line (the kernel's and the tree's sentences may be told with a line break). */
function oneLine(text) {
  return String(text).replace(/\s*\n\s*/g, ' ').trim();
}

/** The same JSON whatever the order of the keys of an object: what two values must share to be called equal. */
function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value === undefined ? null : value);
}

function sameJson(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}

function copyJson(value) {
  return value === undefined ? undefined : clonePlain(value);
}

/** The state a write may change, kept so that a write that is refused puts everything back (the manifests as they were, the lists of files, the marks of what is modified). */
function snapshotWriteState() {
  const workspace = AppState.workspace;
  return {
    files: AppState.manifestFiles.map((mf) => ({ mf, props: Object.assign({}, mf, { header: copyJson(mf.header), content: copyJson(mf.content) }) })),
    pendingFileRemovals: AppState.pendingFileRemovals.slice(),
    removedFileBaselines: new Map(AppState.removedFileBaselines),
    dirtyReferences: new Set(AppState.dirtyReferences),
    expanded: new Set(AppState.expanded),
    selection: Object.assign({}, AppState.selection),
    topLevel: workspace ? copyJson(workspace.topLevel) : undefined,
    settingsCurrent: workspace ? workspace.settings.current : undefined, // the delete of a plateau takes out a `settings.current` that names it (run 0102)
    layers: AppState.layers ? { current: AppState.layers.current, compare: copyJson(AppState.layers.compare) } : null, // and draws another plateau when it was the one drawn
    settingsDirty: workspace ? workspace.settingsDirty : undefined,
    settingsRevision: workspace ? workspace.settingsRevision : undefined,
    saveStatus,
    pendingDeleteConfirmation,
    rawYamlEditDraft,
    mapPinned: mapPinned.slice(),
    mapHidden: mapHidden.slice(),
    mapOpened: mapOpened ? new Set(mapOpened) : mapOpened,
    technologyMapState: { pinned: technologyMapState.pinned.slice(), hidden: technologyMapState.hidden.slice(), opened: technologyMapState.opened ? new Set(technologyMapState.opened) : technologyMapState.opened },
    navActiveKey
  };
}

function restoreWriteState(snapshot) {
  const files = [];
  for (const { mf, props } of snapshot.files) {
    for (const key of Object.keys(mf)) if (!(key in props)) delete mf[key];
    Object.assign(mf, props);
    files.push(mf);
  }
  AppState.manifestFiles = files;
  AppState.pendingFileRemovals = snapshot.pendingFileRemovals;
  AppState.removedFileBaselines = snapshot.removedFileBaselines;
  AppState.dirtyReferences = snapshot.dirtyReferences;
  AppState.expanded = snapshot.expanded;
  AppState.selection = snapshot.selection;
  const workspace = AppState.workspace;
  if (workspace) {
    workspace.topLevel = snapshot.topLevel;
    workspace.settings.current = snapshot.settingsCurrent;
    workspace.settingsDirty = snapshot.settingsDirty;
    workspace.settingsRevision = snapshot.settingsRevision;
  }
  saveStatus = snapshot.saveStatus;
  pendingDeleteConfirmation = snapshot.pendingDeleteConfirmation;
  rawYamlEditDraft = snapshot.rawYamlEditDraft;
  mapPinned = snapshot.mapPinned;
  mapHidden = snapshot.mapHidden;
  mapOpened = snapshot.mapOpened;
  technologyMapState = snapshot.technologyMapState;
  navActiveKey = snapshot.navActiveKey;
  if (snapshot.layers && AppState.layers) {
    AppState.layers.current = snapshot.layers.current;
    AppState.layers.compare = snapshot.layers.compare;
  }
}

/**
 * What a write is judged on: for every plateau of the tree, whether it resolves (`fatal`: the kernel refused a patch), what its resolved graph is (as a text, to tell
 * whether a write changed it) and the sentences the command line refuses it with; and the mistakes of the tree itself.
 */
function layerDigest() {
  const tree = AppState.plateauTree;
  const settings = AppState.workspace.settings;
  const digest = {
    // what a view or a story names is looked at too (run 0100): a delete that leaves a view naming an element that no plateau has now is refused, as it was when the view belonged to a plateau
    sentences: tree.problems.map(String).concat((tree.redeclared || []).map(String), elementDuplicates().map((d) => 'the reference `' + d.reference + '` is declared twice (' + d.sources.join(', ') + ')'), entryProblemsOf(settings)),
    byPlateau: new Map()
  };
  if (tree.problems.length || layersBlockedReason()) return digest;
  for (const id of tree.ids) {
    const result = layerStateOf(id, settings);
    if (result.fatal) digest.byPlateau.set(id, { fatal: oneLine(result.fatal[0]), graph: null, sentences: result.earlier ? result.earlier.sentences : [] });
    else digest.byPlateau.set(id, { fatal: null, graph: JSON.stringify(result.state.graph), sentences: result.state.problems ? result.state.problems.sentences : [] });
  }
  return digest;
}

/**
 * A sentence of a check as two states of the workspace are compared on it: the list of the plateaus some sentences end with is left out, and a step that names no plateau
 * is the same mistake whether the workspace has other plateaus or none. A step that was wrong before a plateau is created or deleted is not a new mistake (run 0102).
 */
function comparableSentence(sentence) {
  const text = String(sentence);
  const step = text.match(/^(the story .* step \d+ says `(?:at|against): [^`]*`)(?:, which is not a plateau of this workspace| but the workspace declares no plateau)/);
  if (step) return step[1] + ': not a plateau';
  return text.replace(/ \(the plateaus are [^)]*\)$/, '');
}

/** `{ broken, changed }`: the first sentence of what a write broke (a plateau that resolved no longer does, or the command line refuses it for a new reason), and the plateaus other than `written` whose graph it changed. */
function judgeLayerWrite(before, after, written) {
  const fresh = (now, then) => { const known = then.map(comparableSentence); return now.find((sentence) => !known.includes(comparableSentence(sentence))) || null; };
  const mistake = fresh(after.sentences, before.sentences);
  if (mistake) return { broken: oneLine(mistake), changed: [] };
  const changed = [];
  for (const [id, now] of after.byPlateau) {
    const then = before.byPlateau.get(id);
    if (now.fatal && (!then || !then.fatal)) return { broken: 'the plateau `' + id + '` could no longer be resolved (' + now.fatal + ')', changed: [] };
    const sentence = fresh(now.sentences, then ? then.sentences : []);
    if (sentence) return { broken: oneLine(sentence), changed: [] };
    if (then && id !== written && now.graph !== then.graph) changed.push(id);
  }
  return { broken: null, changed };
}

/**
 * Runs `spec.write()` (which edits the manifests and ends in `rebuildIndexAndRender`) under the rules of writing in a layer, and keeps it only if all of them hold:
 *   - `spec.verify(result)`, if given, throws when the resolution does not give back what was edited;
 *   - no plateau that resolved before is refused now, and no new mistake appears in the tree or in a plateau;
 *   - the plateaus other than `spec.plateau` whose graph changed are told to the author, who has to say yes (`spec.confirmed`); until then nothing is kept.
 * A write that is not kept puts everything back (`snapshotWriteState`) and the page is drawn again. A refusal is an `Error` with one sentence. Pending confirmation:
 * the dialog of `spec.again` is opened and `{ pending: true, changed }` (the plateaus it changes) is returned. `spec`: { plateau, write, verify, confirmed, confirmedFor, again,
 * summary } (`confirmedFor`: the plateaus the author already said yes to, in a dialog of the write itself; a change of any other one is still asked).
 */
function guardedLayerWrite(spec) {
  if (!AppState.layers || !AppState.workspace || !AppState.plateauTree) return spec.write();
  if (AppState.plateauTree.layered && !loadedKernel) {
    throw new Error('The viewpoint kernel is not loaded yet, so the plateaus cannot be resolved and checked: nothing was written. Try again in a moment.');
  }
  const before = layerDigest();
  const snapshot = snapshotWriteState();
  const typedForm = keepElementForm(); // the write is tried, then put back with a redraw when the dialog is to be asked: the form as typed is kept before it (run 0121, #123)
  let result;
  let verdict;
  try {
    result = spec.write();
    if (spec.verify) spec.verify(result);
    verdict = judgeLayerWrite(before, layerDigest(), spec.plateau);
  } catch (e) {
    restoreWriteState(snapshot);
    rebuildIndexAndRender();
    throw e;
  }
  // `spec.confirmedFor`: the plateaus whose change the author has already been shown and said yes to (the dialog of the delete of a plateau lists what each plateau above loses)
  const confirmed = spec.confirmed || (Array.isArray(spec.confirmedFor) && verdict.changed.every((changed) => spec.confirmedFor.includes(changed)));
  if (verdict.broken || (verdict.changed.length && !confirmed)) {
    restoreWriteState(snapshot);
    rebuildIndexAndRender();
    if (verdict.broken) throw new Error('Not written: ' + verdict.broken.replace(/\.$/, '') + '. Nothing was changed.');
    openAppDialog({ kind: 'layer-confirm', plateau: spec.plateau, summary: spec.summary, changed: verdict.changed.slice(), onConfirm: spec.again, afterConfirm: spec.afterConfirm, typedForm });
    return { pending: true, changed: verdict.changed.slice() };
  }
  return result;
}

/** What the dialog "this also changes ..." does when the author says yes: the write again, confirmed. A refusal is told in the top bar, as any write's. */
function confirmLayerWrite(dialog) {
  // the form behind the dialog holds what was typed (`render()` put it back): kept before the write, so that a write the yes then fails on gives it back, as `writeElementDraft` does (wave 019, run 0138, #137)
  const typedForm = keepElementForm();
  try {
    const result = dialog.onConfirm();
    if (dialog.afterConfirm) dialog.afterConfirm(result); // what the click that asked would have done next (select what was created, unfold what was moved)
  } catch (e) {
    saveStatus = { state: 'error', failedFile: dialog.plateau, message: e && e.message ? e.message : String(e) };
    keptElementForm = typedForm; // `render()` puts it back and drops it (no dialog is open): view state, no `modelsChanged()`
    render();
  }
}

// ---- The plateau manifest and the folder of a plateau ----

/** The manifest of kind `archicode.morin.io/plateau` that declares a plateau (it holds its name, horizon, parent and patches), or null when the plateau exists through headers only, or is `baseline` with none. */
function plateauManifestFile(id) {
  const node = AppState.plateauTree && AppState.plateauTree.nodes.get(id);
  if (!node || !node.manifest) return null;
  return AppState.manifestFiles.find((mf) => mf.relPath === node.manifest) || null;
}

/**
 * The folder a new manifest of a plateau is written in: the folder of a manifest the plateau already has (one of the layer of the element, when it has one), so that the new file
 * is where the author keeps the plateau's files and in a folder the command line reads; else the first folder of `manifests.paths`.
 */
function plateauFolderFor(id, category) {
  const own = AppState.manifestFiles.filter((mf) => !mf.error && mf.header && mf.content && manifestKindName(mf.header.kind) !== 'plateau' && plateauOfManifest(mf) === id);
  const pick = (category && own.find((mf) => manifestLayer(mf) === category)) || own[0];
  if (pick) return pick.relPath.split('/').slice(0, -1).join('/');
  const dir = firstManifestsDir();
  return dir === undefined ? 'manifests' : dir;
}

/** The manifest of a plateau where its patches are written; one with only its id is made (in memory, like any new file) when the plateau has none. */
function ensurePlateauManifest(id) {
  const existing = plateauManifestFile(id);
  if (existing) return existing;
  const header = { kind: ARCHICODE_KIND_PREFIX + 'plateau', version: '1' };
  const content = { id };
  const relPath = allocateManifestRelPath(plateauFolderFor(id), 'plateau.', id);
  const mf = { relPath, header, content, error: null, rawText: serializeManifestFile(header, content), dirty: true, existedOnDisk: false, lastKnownDiskModified: null };
  adoptRemovedFile(mf);
  AppState.manifestFiles.push(mf);
  AppState.manifestFiles.sort((a, b) => compareCodePoints(a.relPath, b.relPath));
  return mf;
}

/** The manifest is rewritten from its content (the line-preserving save) and marked modified; an edit that puts the file back as it is on disk leaves it unmodified. */
function touchManifest(mf) {
  mf.rawText = reserializeManifestFile(mf);
  mf.dirty = !(mf.existedOnDisk && typeof mf.savedRawText === 'string' && mf.rawText === mf.savedRawText);
}

// ---- Patches ----

/** The element a plateau resolves to, as the JSON of its graph (a copy), or null. */
function resolvedNodeOf(plateau, category, reference) {
  const result = layerStateOf(plateau, AppState.workspace.settings);
  if (result.fatal) return null;
  const node = graphReferencesOf(result.state.graph)[category].get(reference);
  return node ? clonePlain(node) : null;
}

/** The `SET`, `ADD`, `MERGE` and `REMOVE` patches of a plateau that name an element and a field with a `target` (what `patchFor` writes), `[{ patch, rank }]`; the rank is the kernel's (from 1). */
function plateauPatchesOn(plateau, category, reference, field) {
  const out = [];
  AppState.plateauTree.nodes.get(plateau).patches.forEach((patch, i) => {
    if (!patch || typeof patch !== 'object') return;
    if (readIsMissing(patch.target) || !readIsMissing(patch['json-path']) || !readIsMissing(patch.json_path)) return;
    const layer = readIsMissing(patch.layer) ? 'application' : String(patch.layer).toLowerCase();
    if (String(patch.target) === reference && layer === category && !readIsMissing(patch.field) && String(patch.field) === field) out.push({ patch, rank: i + 1 });
  });
  return out;
}

/** The value of a field after the patches of `plateau` except `patch`: what the patch that replaces it applies on. `{ known: false }` when that cannot be resolved. */
function fieldBaseWithout(plateau, patch, category, reference, field) {
  const settings = AppState.workspace.settings;
  const node = AppState.plateauTree.nodes.get(plateau);
  const above = node.parent === null ? null : layerStateOf(node.parent, settings);
  if (above && above.fatal) return { known: false };
  const cache = ensureLayerCache(settings);
  const result = resolveLayerStep(above ? above.state : null, Object.assign({}, node, { patches: node.patches.filter((p) => p !== patch) }), { byPlateau: cache.byPlateau, kernel: loadedKernel, layered: !!cache.tree.layered });
  if (result.fatal) return { known: false };
  const found = graphReferencesOf(result.state.graph)[category].get(reference);
  return found ? { known: true, value: copyJson(found[field]) } : { known: false };
}

function isPlainJsonObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The patch that turns the value a field has (`base`) into the one it must have (`after`), or null when they are the same. The operator is the least that says it:
 *   - a list that gains items at its end: `ADD` (the item, or the list of items);
 *   - a relationship that is changed in place, found by (destination, label) among the relationships of `base`: `SET` with `where` and the fields that changed;
 *   - an object (tags) that keeps every key it had: `MERGE` of the keys that are new or changed;
 *   - a text or a number that is cleared (the field is not a list nor an object, and the plateau no longer has it): `REMOVE` of the field (wave 017, run 0126, #94; a `SET` has no way
 *     to say "absent"). An emptied list or object is still a `SET` of the empty one: an empty list or object is a value;
 *   - anything else, a list that loses or reorders items, an object that loses a key, a text, a number: `SET` of the whole value.
 * When `base` is not known the value is set whole.
 */
function patchFor(field, base, after) {
  const listy = Array.isArray(after) || (base.known && Array.isArray(base.value));
  const objecty = isPlainJsonObject(after) || (base.known && isPlainJsonObject(base.value));
  const empty = listy ? [] : objecty ? {} : undefined;
  const now = readIsMissing(after) ? empty : after;
  const was = base.known ? (readIsMissing(base.value) ? empty : base.value) : undefined;
  if (base.known && sameJson(was, now)) return null;
  if (now === undefined) return { operator: 'REMOVE' };
  if (Array.isArray(now)) {
    if (base.known && Array.isArray(was)) {
      if (now.length > was.length && was.every((item, i) => sameJson(item, now[i]))) {
        const extra = now.slice(was.length);
        return { operator: 'ADD', value: extra.length === 1 ? extra[0] : extra };
      }
      if (field === 'relationships' && now.length === was.length) {
        const differing = now.map((item, i) => i).filter((i) => !sameJson(was[i], now[i]));
        if (differing.length === 1) {
          const i = differing[0];
          const old = was[i];
          const next = now[i];
          if (isPlainJsonObject(old) && isPlainJsonObject(next) && typeof old.destination === 'string' && Object.keys(old).every((key) => key in next)) {
            const label = readIsMissing(old.label) ? '' : String(old.label);
            const same = was.filter((item) => isPlainJsonObject(item) && item.destination === old.destination && (readIsMissing(item.label) ? '' : String(item.label)) === label);
            if (same.length === 1) {
              const value = {};
              for (const key of Object.keys(next)) if (!sameJson(old[key], next[key])) value[key] = next[key];
              const where = { destination: old.destination };
              if (label !== '') where.label = label;
              return { operator: 'SET', where, value };
            }
          }
        }
      }
    }
    return { operator: 'SET', value: now };
  }
  if (isPlainJsonObject(now) && base.known && (was === undefined || isPlainJsonObject(was)) && Object.keys(was || {}).every((key) => key in now)) {
    const value = {};
    for (const key of Object.keys(now)) if (!was || !sameJson(was[key], now[key])) value[key] = now[key];
    return { operator: 'MERGE', value };
  }
  return { operator: 'SET', value: now };
}

/** A patch as a manifest holds it, the keys in the order the fixture writes them: operator, target, layer, field, where, value (a `REMOVE` of a field has no value). */
function newPatchObject(category, reference, field, wanted) {
  const patch = { operator: wanted.operator, target: reference };
  if (category === 'technology') patch.layer = 'technology';
  patch.field = field;
  if (wanted.where) patch.where = wanted.where;
  if (wanted.operator !== 'REMOVE') patch.value = wanted.value;
  return patch;
}

/** Puts `value` under `key` of `object` just before `beforeKey` (the keys already there keep their order). */
function insertKeyBefore(object, beforeKey, key, value) {
  const entries = Object.keys(object).map((k) => [k, object[k]]);
  for (const [k] of entries) delete object[k];
  let placed = false;
  for (const [k, v] of entries) {
    if (k === beforeKey) { object[key] = value; placed = true; }
    object[k] = v;
  }
  if (!placed) object[key] = value;
}

/** The patch `patch` of a manifest now says `wanted`: only the keys that differ are written, so the lines of the others stay as the author wrote them. */
function updatePatchInPlace(patch, wanted) {
  if (String(patch.operator).toUpperCase() !== wanted.operator) patch.operator = wanted.operator;
  if (wanted.where) {
    if (patch.where === undefined) insertKeyBefore(patch, 'value', 'where', wanted.where);
    else if (!sameJson(patch.where, wanted.where)) patch.where = wanted.where;
  } else if ('where' in patch) {
    delete patch.where;
  }
  if (wanted.operator === 'REMOVE') delete patch.value; // a `REMOVE` of a field takes no value
  else if (!sameJson(patch.value, wanted.value)) patch.value = wanted.value;
}

/** The items a patch adds, as a list (`value` is one item or a list of them). */
function patchItems(patch) {
  return Array.isArray(patch.value) ? patch.value : [patch.value];
}

/**
 * Whether the patch `last` can say `delta` (the patch an edit asks for, computed from the value the field has now) instead of a patch after it: a `SET` of the whole value says
 * the new value (`after`); an `ADD` gains the items, a `MERGE` the keys; a `SET` with `where` takes the fields when it finds the relationship `delta.where` finds once it has
 * run. Changes the patch and returns true, or leaves it and returns false.
 */
function absorbIntoPatch(last, delta, after) {
  const operator = String(last.operator).toUpperCase();
  if (delta.operator === 'REMOVE') { // the field is cleared: a whole-value `SET` becomes the `REMOVE`, one that already took it out says so; any other patch stays and the `REMOVE` follows it
    if (operator === 'SET' && !last.where) updatePatchInPlace(last, delta);
    return (operator === 'SET' && !last.where) || operator === 'REMOVE';
  }
  if (operator === 'SET' && !last.where) {
    last.value = readIsMissing(after) ? (Array.isArray(last.value) ? [] : {}) : after;
    return true;
  }
  if (operator === 'ADD' && delta.operator === 'ADD') {
    const items = patchItems(last).concat(patchItems(delta));
    last.value = items.length === 1 ? items[0] : items;
    return true;
  }
  if (operator === 'MERGE' && delta.operator === 'MERGE' && isPlainJsonObject(last.value)) {
    last.value = Object.assign({}, last.value, delta.value);
    return true;
  }
  if (operator === 'SET' && last.where && delta.operator === 'SET' && delta.where && isPlainJsonObject(last.value) && isPlainJsonObject(delta.value)) {
    const destination = 'destination' in last.value ? String(last.value.destination) : String(last.where.destination);
    const label = 'label' in last.value ? String(last.value.label) : (readIsMissing(last.where.label) ? '' : String(last.where.label));
    if (destination === delta.where.destination && label === (readIsMissing(delta.where.label) ? '' : String(delta.where.label))) {
      last.value = Object.assign({}, last.value, delta.value);
      return true;
    }
  }
  return false;
}

/** Whether a `SET` with `where` only says what the relationship it finds already says without that patch (relabeled and then relabeled back): it can go. */
function patchSaysNothingNew(plateau, patch, category, reference, field) {
  const base = fieldBaseWithout(plateau, patch, category, reference, field);
  if (!base.known || !Array.isArray(base.value) || !isPlainJsonObject(patch.value)) return false;
  const label = readIsMissing(patch.where.label) ? '' : String(patch.where.label);
  const found = base.value.filter((item) => isPlainJsonObject(item) && item.destination === patch.where.destination && (readIsMissing(item.label) ? '' : String(item.label)) === label);
  return found.length === 1 && Object.keys(patch.value).every((key) => sameJson(found[0][key], patch.value[key]));
}

/**
 * Writes the change of one field of an inherited element (or of one a patch of the plateau already sets) as a patch of the plateau, and returns the manifest written.
 *   - the plateau has no patch on (target, field): one is added at the end (`patchFor`, from the value the field has now);
 *   - it has one that sets the whole value (`SET`): that patch says the new value, or is taken out when the field is back to what it was before it;
 *   - it has one that adds or merges (`ADD`, `MERGE`, `SET` with `where`): that patch is changed when the edit is of its kind, taken out when the field is back to what it was
 *     before it, and otherwise a patch for the edit is added at the end (an `ADD` of a relationship stays when another relationship is relabeled). A patch is never put in the middle of the list: the comment above a patch of the author's would end up above the new one.
 */
function writePatchChange(plateau, category, reference, change) {
  const mf = ensurePlateauManifest(plateau);
  if (!Array.isArray(mf.content.patches)) mf.content.patches = [];
  const patches = mf.content.patches;
  const mine = plateauPatchesOn(plateau, category, reference, change.field);
  const now = { known: true, value: change.before };
  if (mine.length === 0) {
    const wanted = patchFor(change.field, now, change.after);
    if (wanted) patches.push(newPatchObject(category, reference, change.field, wanted));
  } else if (mine.length > 1) {
    // several patches on the field (a relationship added, another relabeled): none is rewritten; the last absorbs an edit of its kind, else the edit is a patch at the end
    const last = mine[mine.length - 1].patch;
    const delta = patchFor(change.field, now, change.after);
    if (delta && !absorbIntoPatch(last, delta, change.after)) patches.push(newPatchObject(category, reference, change.field, delta));
    else if (delta && last.where && patchSaysNothingNew(plateau, last, category, reference, change.field)) patches.splice(patches.indexOf(last), 1); // relabeled and relabeled back
  } else {
    const patch = mine[0].patch;
    const operator = String(patch.operator).toUpperCase();
    const base = fieldBaseWithout(plateau, patch, category, reference, change.field);
    const inPlace = patchFor(change.field, base, change.after);
    if (base.known && !inPlace) {
      patches.splice(patches.indexOf(patch), 1);
    } else if (inPlace && inPlace.operator === 'REMOVE') {
      updatePatchInPlace(patch, inPlace); // the field is gone: the patch that set it says so (or the one that took it out keeps saying it)
    } else if (operator === 'REMOVE' && inPlace) {
      updatePatchInPlace(patch, inPlace); // the plateau gives the field a value again: the patch that took it out says that value instead
    } else if (operator === 'SET' && !patch.where) {
      updatePatchInPlace(patch, { operator: 'SET', value: readIsMissing(change.after) ? (Array.isArray(change.before) ? [] : {}) : change.after });
    } else if (inPlace && inPlace.operator === operator && sameJson(inPlace.where, patch.where)) {
      updatePatchInPlace(patch, inPlace);
    } else {
      const delta = patchFor(change.field, now, change.after);
      if (delta) patches.push(newPatchObject(category, reference, change.field, delta));
    }
  }
  if (!patches.length) delete mf.content.patches;
  return mf;
}

/** The sentence for a field that cannot be written because of a patch the author wrote by hand (a free `json-path`, which the editor shows and does not edit field by field). */
function handWrittenPatchSentence(record, field, plateau) {
  const last = record.patched ? record.patched.get(field) : null;
  if (!last || last.plateau !== plateau || last.operator === 'REMOVE' || !/^json-path /.test(String(last.selector))) return null;
  return 'Not written: `' + field + '` of `' + record.reference + '` is set by patch ' + last.rank + ' of the plateau `' + plateau + '` (' + last.operator + ' ' + last.selector + '), which was written by hand with a free `json-path`: the editor shows it and does not edit it field by field. Edit the patch in Files. Nothing was changed.';
}

/**
 * What an edit of an element does in a layered plateau. The mutator is tried on a copy of the element as the plateau resolves it; the fields it changes are each written where
 * they belong (`route`): `manifest` (the element is declared in the plateau, and no patch of the plateau sets the field), else `patch` (the plateau has a patch on the field, or
 * inherits the element). Returns `{ changes: [{ field, before, after, route }], renamed }`, or throws the sentence that refuses the edit.
 */
function planLayerElementEdit(plateau, record, category, reference, mutatorFn) {
  const resolved = resolvedNodeOf(plateau, category, reference);
  if (!resolved) throw new Error('"' + reference + '" cannot be found in the plateau `' + plateau + '`; nothing was changed.');
  const trial = clonePlain(resolved);
  const outcome = mutatorFn(trial, null, null);
  const renamed = (outcome && outcome.renamedTo) || (String(trial.id) !== String(resolved.id) ? { from: reference, to: null } : null);
  if (renamed && plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau) {
    throw new Error('Not written: `' + reference + '` is declared in the plateau `' + record.declaredIn + '`, and a patch never changes an id: it is renamed where it is declared. Draw `' + record.declaredIn + '` to rename it. Nothing was changed.');
  }
  if (String(trial.kind) !== String(resolved.kind)) throw new Error('Not written: the kind of an element is not edited here. Nothing was changed.');
  const located = plateau !== BASELINE_PLATEAU && record.declaredIn === plateau ? locateContentNode(reference, category, record) : null;
  const changes = [];
  for (const field of Array.from(new Set(Object.keys(resolved).concat(Object.keys(trial)))).sort(compareUnits)) {
    if (field === 'id' || field === 'elements' || field === 'kind') continue;
    if (sameJson(resolved[field], trial[field])) continue;
    const change = { field, before: copyJson(resolved[field]), after: copyJson(trial[field]), route: 'manifest' };
    if (plateau !== BASELINE_PLATEAU) {
      const handWritten = handWrittenPatchSentence(record, field, plateau);
      if (handWritten) throw new Error(handWritten);
      const mine = plateauPatchesOn(plateau, category, reference, field);
      if (mine.length >= 1 || !located || !sameJson(located.node[field], resolved[field])) change.route = 'patch';
    }
    changes.push(change);
  }
  if (renamed && changes.some((change) => change.route === 'patch')) {
    throw new Error('Not written: `' + reference + '` is renamed and a patch of the plateau `' + plateau + '` sets a field in the same edit (' + changes.filter((change) => change.route === 'patch').map((change) => change.field).join(', ') + '): save the rename, then the change. Nothing was changed.');
  }
  return { changes, renamed };
}

/** After a write: the resolution of the plateau gives back every field that was edited (an empty list or object stands for an absent one), and the new reference of a renamed element. Throws the sentence otherwise. */
function verifyLayerElementEdit(plateau, category, reference, plan) {
  const target = plan.renamed && plan.renamed.to ? plan.renamed.to : reference;
  const node = resolvedNodeOf(plateau, category, target);
  const refused = node ? null : layerStateOf(plateau, AppState.workspace.settings);
  if (refused && refused.fatal) throw new Error('Not written: the plateau `' + plateau + '` could no longer be resolved (' + oneLine(refused.fatal[0]) + '). Nothing was changed.');
  if (!node) throw new Error('Not written: after the edit the plateau `' + plateau + '` has no element `' + target + '`. Nothing was changed.');
  for (const change of plan.changes) {
    const empty = Array.isArray(change.before) || Array.isArray(change.after) ? [] : isPlainJsonObject(change.before) || isPlainJsonObject(change.after) ? {} : undefined;
    const wanted = readIsMissing(change.after) ? empty : change.after;
    const got = readIsMissing(node[change.field]) ? empty : node[change.field];
    if (!sameJson(got, wanted)) {
      throw new Error('Not written: the resolution of the plateau `' + plateau + '` does not give back the new `' + change.field + '` of `' + target + '` (it reads ' + oneLine(JSON.stringify(got === undefined ? null : got)).slice(0, 80) + '). Nothing was changed.');
    }
  }
}

/** The edit of an element in a layered plateau (see `planLayerElementEdit`), under `guardedLayerWrite`. */
function commitLayeredElementEdit(plateau, reference, mutatorFn, layer, options) {
  const category = layerOfReference(reference, layer);
  const record = category ? AppState.index[category].get(reference) : null;
  if (!record) return commitElementEditNow(reference, mutatorFn, layer, options); // says it cannot be found
  const label = record.name || reference;
  const base = {
    plateau, confirmed: !!options.confirmed, afterConfirm: options.afterConfirm, summary: 'Edit “' + label + '” in the plateau `' + plateau + '`',
    again: () => commitElementEdit(reference, mutatorFn, layer, Object.assign({}, options, { confirmed: true }))
  };
  if (options.live) {
    // the mutator edits the file that declares the element itself (a move, a child written in the file of its parent): it must be a file of the plateau written
    if (plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau) {
      throw new Error('Not written: `' + reference + '` is declared in the plateau `' + record.declaredIn + '`, not in `' + plateau + '`, and a patch never changes where an element is. Draw `' + record.declaredIn + '` to do it. Nothing was changed.');
    }
    return guardedLayerWrite(Object.assign(base, {
      write: () => commitElementEditNow(reference, mutatorFn, layer, options),
      verify: (result) => verifyLayerElementEdit(plateau, category, reference, { changes: [], renamed: result && result.renamedTo ? result.renamedTo : null })
    }));
  }
  const plan = planLayerElementEdit(plateau, record, category, reference, mutatorFn);
  const inherited = plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau;
  if (!plan.changes.length && !plan.renamed && inherited) { // nothing to say: nothing is written, and the file of another plateau is not marked
    saveStatus = { state: 'idle' };
    rebuildIndexAndRender();
    return undefined;
  }
  const write = plan.changes.every((change) => change.route === 'manifest')
    ? () => commitElementEditNow(reference, mutatorFn, layer, options)
    : () => writeMixedElementEdit(plateau, record, category, reference, plan);
  return guardedLayerWrite(Object.assign(base, { write, verify: () => verifyLayerElementEdit(plateau, category, reference, plan) }));
}

/** An edit whose fields do not all belong in the same file: the ones of the manifest that declares the element are set on it, the others are patches of the plateau. */
function writeMixedElementEdit(plateau, record, category, reference, plan) {
  const touched = new Set();
  for (const change of plan.changes) {
    if (change.route === 'patch') {
      touched.add(writePatchChange(plateau, category, reference, change));
    } else {
      const located = locateContentNode(reference, category, record);
      if (readIsMissing(change.after)) delete located.node[change.field]; else located.node[change.field] = clonePlain(change.after);
      touched.add(located.mf);
    }
  }
  for (const mf of touched) touchManifest(mf);
  AppState.dirtyReferences.add(nodeKey(reference, category));
  saveStatus = { state: 'idle' };
  rebuildIndexAndRender();
  return undefined;
}

/** An inherited element is taken out by a `REMOVE` patch at the end of the patches of the plateau: the kernel takes what is in it and what points at it. */
function writeRemovePatch(plateau, category, reference) {
  const mf = ensurePlateauManifest(plateau);
  if (!Array.isArray(mf.content.patches)) mf.content.patches = [];
  const patch = { operator: 'REMOVE', target: reference };
  if (category === 'technology') patch.layer = 'technology';
  mf.content.patches.push(patch);
  touchManifest(mf);
  forgetUiReferences(computeDeletedReferenceSet(reference, category), category);
  pendingDeleteConfirmation = null;
  saveStatus = { state: 'idle' };
  rebuildIndexAndRender();
}

/**
 * Takes out of the patches of a plateau the ones that name an element that was deleted from its own manifests (their `target`, the relationship they find with `where`, the
 * relationships they add): left in, the plateau would no longer resolve. Returns whether the manifest of the plateau changed.
 */
function prunePatchesNaming(plateau, deletedRefs, category) {
  const mf = plateauManifestFile(plateau);
  if (!mf || !Array.isArray(mf.content.patches)) return null;
  const gone = (value) => (typeof value === 'string' || typeof value === 'number') && deletedRefs.has(String(value));
  const patchLayer = (patch) => (readIsMissing(patch.layer) ? 'application' : String(patch.layer).toLowerCase());
  const kept = [];
  let modified = false;
  // what a patch adds or sets as a list of references: the destinations of relationships, the applications a node hosts, the elements an environment uses
  const listOf = (patch) => {
    const field = String(patch.field);
    if (field === 'relationships' && patchLayer(patch) === category) return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: (item) => isPlainJsonObject(item) && gone(item.destination) };
    if (field === 'applications' && category === 'application' && patchLayer(patch) === 'technology') return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: gone };
    if (field === 'uses' && category === 'technology' && patchLayer(patch) === 'technology') return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: gone };
    return null;
  };
  for (const patch of mf.content.patches) {
    if (patch && typeof patch === 'object') {
      if (patchLayer(patch) === category && (gone(readIsMissing(patch.target) ? null : String(patch.target)) || (isPlainJsonObject(patch.where) && gone(patch.where.destination)))) { modified = true; continue; }
      const operator = String(patch.operator).toUpperCase();
      const list = !readIsMissing(patch.value) && (operator === 'ADD' || operator === 'SET') && !patch.where ? listOf(patch) : null;
      if (list) {
        const left = list.items.filter((item) => !list.named(item));
        if (left.length !== list.items.length) {
          modified = true;
          if (!left.length && operator === 'ADD') continue; // nothing is left to add
          patch.value = Array.isArray(patch.value) ? left : left[0];
        }
      }
    }
    kept.push(patch);
  }
  if (!modified) return null;
  if (kept.length) mf.content.patches = kept; else delete mf.content.patches;
  return mf;
}

// ---- Plateaus: created, named, given a horizon and a parent ----

const PLATEAU_CONTENT_ORDER = ['id', 'name', 'horizon', 'override', 'patches'];

/** Sets `key` of the content of a plateau manifest (or takes it out when `value` is empty), placing a new key where the order `id, name, horizon, override, patches` puts it. */
function setPlateauContentKey(content, key, value) {
  const empty = readIsMissing(value) || String(value).trim() === '';
  if (empty) {
    delete content[key];
    return;
  }
  if (key in content) {
    if (String(content[key]) !== String(value)) content[key] = value;
    return;
  }
  const later = PLATEAU_CONTENT_ORDER.slice(PLATEAU_CONTENT_ORDER.indexOf(key) + 1).find((other) => other in content);
  if (later) insertKeyBefore(content, later, key, value); else content[key] = value;
}

/** The sentence that refuses an id for a new plateau, or null. */
function plateauIdProblem(id) {
  if (id === '') return 'A plateau needs an id.';
  if (!LAYER_PLATEAU_ID_PATTERN.test(id)) return 'The id of a plateau uses lowercase letters, digits, `_` and `-` (no dot, no space).';
  if (AppState.plateauTree.nodes.has(id) || AppState.plateauTree.ids.includes(id)) return 'The plateau `' + id + '` exists already.';
  return null;
}

/**
 * Creates a plateau that overrides `spec.parent` (baseline by default): a manifest of kind `archicode.morin.io/plateau` with its id, name, horizon and `override`
 * (not written when the parent is baseline, which is what an absent `override` means). Under `guardedLayerWrite`. Returns `{ relPath }` or `{ pending: true }`.
 */
function commitPlateauCreate(spec, options) {
  const id = String(spec.id === undefined || spec.id === null ? '' : spec.id).trim();
  const parent = readIsMissing(spec.parent) || spec.parent === '' ? BASELINE_PLATEAU : String(spec.parent);
  const problem = plateauIdProblem(id);
  if (problem) throw new Error(problem);
  if (!AppState.plateauTree.nodes.has(parent)) throw new Error('The plateau `' + parent + '` does not exist, so `' + id + '` cannot override it.');
  const name = readIsMissing(spec.name) ? '' : String(spec.name).trim();
  const horizon = readIsMissing(spec.horizon) ? '' : String(spec.horizon).trim();
  return guardedLayerWrite({
    plateau: id,
    confirmed: !!(options && options.confirmed),
    summary: 'Create the plateau `' + id + '` over `' + parent + '`',
    again: () => commitPlateauCreate(spec, Object.assign({}, options, { confirmed: true })),
    write: () => {
      const header = { kind: ARCHICODE_KIND_PREFIX + 'plateau', version: '1' };
      const content = { id };
      setPlateauContentKey(content, 'name', name);
      setPlateauContentKey(content, 'horizon', horizon);
      if (parent !== BASELINE_PLATEAU) setPlateauContentKey(content, 'override', parent);
      const dir = firstManifestsDir();
      const relPath = allocateManifestRelPath(dir === undefined ? 'manifests' : dir, 'plateau.', id);
      const mf = { relPath, header, content, error: null, rawText: serializeManifestFile(header, content), dirty: true, existedOnDisk: false, lastKnownDiskModified: null };
      adoptRemovedFile(mf);
      AppState.manifestFiles.push(mf);
      AppState.manifestFiles.sort((a, b) => compareCodePoints(a.relPath, b.relPath));
      saveStatus = { state: 'idle' };
      rebuildIndexAndRender();
      return { relPath };
    },
    verify: () => {
      const node = AppState.plateauTree.nodes.get(id);
      if (!node || node.parent !== parent) throw new Error('Not written: the new plateau `' + id + '` does not read back as a plateau over `' + parent + '`. Nothing was changed.');
    }
  });
}

/**
 * Renames a plateau, gives it a horizon or another parent, in its manifest of kind `archicode.morin.io/plateau` (one is made when the plateau exists through headers only).
 * `spec`: { id, name, horizon, parent } (`parent` is ignored for baseline, which overrides nothing). A plateau cannot go under itself or under a plateau that overrides it.
 * Under `guardedLayerWrite`: a new parent changes what the plateau inherits, so the plateaus it changes are told first.
 */
function commitPlateauEdit(spec, options) {
  const id = String(spec.id);
  const node = AppState.plateauTree.nodes.get(id);
  if (!node) throw new Error('The plateau `' + id + '` does not exist.');
  const name = readIsMissing(spec.name) ? '' : String(spec.name).trim();
  const horizon = readIsMissing(spec.horizon) ? '' : String(spec.horizon).trim();
  const parent = id === BASELINE_PLATEAU ? null : (readIsMissing(spec.parent) || spec.parent === '' ? BASELINE_PLATEAU : String(spec.parent));
  if (parent !== null) {
    if (!AppState.plateauTree.nodes.has(parent)) throw new Error('The plateau `' + parent + '` does not exist, so `' + id + '` cannot override it.');
    if (parent === id || layerIsBelow(parent, id)) throw new Error('The plateau `' + id + '` cannot override `' + parent + '`: it would override itself.');
  }
  const unchanged = (node.name || '') === name && (node.horizon || '') === horizon && node.parent === parent;
  if (unchanged) return { unchanged: true };
  return guardedLayerWrite({
    plateau: id,
    confirmed: !!(options && options.confirmed),
    summary: 'Edit the plateau `' + id + '`',
    again: () => commitPlateauEdit(spec, Object.assign({}, options, { confirmed: true })),
    write: () => {
      const mf = ensurePlateauManifest(id);
      setPlateauContentKey(mf.content, 'name', name);
      setPlateauContentKey(mf.content, 'horizon', horizon);
      if (parent !== null && node.parent !== parent) setPlateauContentKey(mf.content, 'override', parent === BASELINE_PLATEAU ? '' : parent);
      touchManifest(mf);
      saveStatus = { state: 'idle' };
      rebuildIndexAndRender();
      return { relPath: mf.relPath };
    },
    verify: () => {
      const now = AppState.plateauTree.nodes.get(id);
      if (!now || (now.name || '') !== name || (now.horizon || '') !== horizon || now.parent !== parent) {
        throw new Error('Not written: the plateau `' + id + '` does not read back as it was edited. Nothing was changed.');
      }
    }
  });
}

// ---- Plateaus: deleted (wave 015, run 0102, W-14, issue #93; a plateau in the middle of the tree: wave 018, run 0132, #112) ----
//
// Any plateau but the root can go. What goes is listed before anything is done, and nothing else goes: its manifest of kind `archicode.morin.io/plateau` and every manifest
// whose header says its id (a view or a story that says it belongs to no plateau, run 0100: it stays). The files are queued for removal like the files of a deleted element
// (`pendingFileRemovals`): they leave the disk at the next "Save all changes", with its check that the disk did not change meanwhile. A plateau that other plateaus override
// (decision D5 of the author, 2026-10-21) is deleted in the same one step: the plateaus that override it go under the plateau it overrode (their `override` is edited, in the
// manifest of kind plateau that says it, or taken out when that plateau is the root), and what it brought, its elements and its patches, is lost to every plateau that stood
// on it. The dialog says, for each of them, what it loses, gets back (an element the deleted plateau removed) and reads differently, worked out by resolving it again without
// the plateau (`plateauDeletionAbove`), not guessed. A plateau above that would no longer resolve (a patch that selects nothing, a relationship towards an element that is
// gone) refuses the delete: that is a mistake to repair first, not a loss. Three things name a plateau besides its files (and a saved view is looked at too):
//   - `settings.current`: the delete takes it out of .archicode.yaml (the editor has no other place to change it, and a `current` that names no plateau stops both tools);
//   - a step of a story (`at`, `against`, run 0101): the delete is refused and lists the steps, as it is for a view or a step that names an element that only this
//     plateau declares, and for a step told at or compared with a plateau above that would lose an element the step draws (`at`: run 0132; `against`: wave 019,
//     run 0139, #138). Which plateau the step should be told at instead is the author's choice, made with the two lists of the step in Stories;
//   - a saved view drawn in a plateau above that would lose what it draws (#138, `stepsLosingTheirView`) refuses it too, with the same kind of sentence. Nothing is offered
//     instead of a refusal (the author's decision of 2026-10-22): the plateaus above are repaired first, or the plateau is folded into them by hand;
//   - the `override` of the plateaus above, rewritten as said.

/**
 * What deleting the plateau `id` would do, computed from the manifests as they are and changing nothing: `refusal` (one sentence: the root, plateaus that cannot be drawn,
 * the kernel not loaded while plateaus stand on it), `overriding` (the plateaus that override it: they go under `parent`, the plateau it overrides), `files`
 * (`[{ relPath, plateau, unsaved, modified }]`, the files that go: `plateau` is its manifest of kind plateau), `rewritten` (`[{ id, relPath }]`, the manifest of each plateau
 * that overrides it, whose `override` changes), `above` (what each plateau that stands on it becomes, see `plateauDeletionAbove`), `patches` (how many patches it has, which
 * no plateau applies any more), `breaks` (the sentences of the plateaus above that would no longer be valid), `current` (the `settings.current` that is taken out, or null),
 * `blocking` (the sentences of the views and stories that stay and would be wrong: the steps that name the plateau, the views and steps that name an element only it
 * declares, the steps told at or compared with a plateau above and the saved views drawn in one that would lose what they draw: `stepsLosingTheirView`), `kept` (the views and stories that say `plateau: <id>`) and `unread` (every `.toml` and
 * `.json` manifest, whose text the editor does not keep, and the YAML files it could not read whose text has the id: none is deleted or rewritten, and one that says
 * `plateau: <id>` or `override: <id>` would keep the plateau for the command line).
 */
function plateauDeletion(id) {
  const tree = AppState.plateauTree;
  const layers = AppState.layers;
  const node = tree ? tree.nodes.get(id) : null;
  const plan = { id, refusal: null, parent: null, overriding: [], files: [], rewritten: [], above: [], patches: 0, breaks: [], current: null, blocking: [], kept: [], unread: [] };
  if (!layers || !tree || !tree.layered) { plan.refusal = 'This workspace has no plateau but baseline, which cannot be deleted.'; return plan; }
  if (layers.blocked) { plan.refusal = 'No plateau is deleted while the plateaus cannot be drawn: ' + oneLine(layers.blocked); return plan; }
  if (!node) { plan.refusal = 'The plateau `' + id + '` does not exist.'; return plan; }
  if (node.parent === null) { plan.refusal = 'The plateau `' + id + '` is the root of the plateaus: every other plateau stands on it, so it cannot be deleted.'; return plan; }
  plan.parent = node.parent;
  plan.overriding = layerChildrenOf(id);
  plan.patches = node.patches.length;
  if (plan.overriding.length && !loadedKernel) {
    plan.refusal = 'The viewpoint kernel is not loaded yet, so what the plateaus that override `' + id + '` would lose cannot be worked out: nothing is deleted. Try again in a moment.';
    return plan;
  }
  const goes = new Set([node.manifest].concat(node.headers).filter((relPath) => relPath));
  plan.files = AppState.manifestFiles.filter((mf) => goes.has(mf.relPath)).map((mf) => ({ relPath: mf.relPath, plateau: mf.relPath === node.manifest, unsaved: !mf.existedOnDisk, modified: !!(mf.existedOnDisk && mf.dirty) }));
  // a plateau that overrides another than the root says so in its manifest of kind plateau: that is the file its new parent is written in (none is ever made for it)
  plan.rewritten = plan.overriding.map((child) => ({ id: child, relPath: tree.nodes.get(child).manifest }));
  plan.kept = AppState.manifestFiles.filter((mf) => !mf.error && isPlateauFreeManifest(mf) && headerPlateau(mf.header) === id).map((mf) => mf.relPath);
  const named = new RegExp('(^|[^a-z0-9_-])' + id.replace(/[-]/g, '\\-') + '($|[^a-z0-9_-])', 'm');
  plan.unread = (AppState.unreadManifestFiles || []).concat(AppState.manifestFiles.filter((mf) => mf.error && named.test(String(mf.rawText || ''))).map((mf) => mf.relPath)).sort(compareCodePoints);
  const settings = AppState.workspace.settings;
  // the files as they would be: those of the plateau gone, the `override` of the plateaus that override it rewritten (for a leaf: the files that stay, as they are)
  const effects = plateauDeletionAbove(id, goes);
  const after = effects.tree;
  plan.above = effects.above;
  plan.breaks = effects.breaks;
  const now = entryProblemsOf(settings).map(comparableSentence);
  plan.blocking = entryProblemsIn(effects.files, after, null).filter((sentence) => !now.includes(comparableSentence(sentence))) // a step that was wrong already is not the delete's
    .concat(stepsLosingTheirView(effects));
  // `current` naming the plateau, or `baseline` in a workspace that has no plateau left: both tools would refuse the workspace (a `current` that was wrong already is not the delete's)
  if (settings.current === id || (settings.current === BASELINE_PLATEAU && !after.layered)) plan.current = settings.current;
  return plan;
}

/**
 * What the plateaus that stand on `id` become once it is deleted (wave 018, run 0132, #112): the plateaus that override it are given its parent, and each plateau that stands
 * on it, directly or not, is resolved again with the kernel (`resolveLayerStep`, from the states of the plateaus that do not change, `layerStateOf`) and compared with what it
 * resolves to now. Returns `{ files, tree, above, breaks, before, after }`: `files` and `tree` are the manifests and the tree of the plateaus as they would be; `above`, in the
 * order of the tree, `[{ id, parent, newParent, lost, back, changed, unknown }]`: `lost` the elements it has now and would not have (each nested element named), `back` those
 * it would have again (the deleted plateau removed them), `changed` those it keeps whose own fields would read differently (a patch of the deleted plateau set them), each
 * `{ application: [...], technology: [...] }` sorted by reference, and `unknown` when it could not be resolved before (nothing is said of it then); `breaks` the sentences
 * of the plateaus above that would no longer resolve, or that the command line would refuse for a reason it does not have now (`judgeLayerWrite` decides the same
 * after the write); `before` and `after` the states, by plateau id. Kept with the layers (`layerCache`) for one tree and one text of the manifests.
 */
function plateauDeletionAbove(id, goes) {
  const tree = AppState.plateauTree;
  const settings = AppState.workspace.settings;
  const cache = ensureLayerCache(settings);
  if (!cache.deletions) cache.deletions = new Map();
  if (cache.deletions.has(id)) return cache.deletions.get(id);
  const parent = tree.nodes.get(id).parent;
  const children = new Map(layerChildrenOf(id).map((child) => [tree.nodes.get(child).manifest, child]));
  const files = AppState.manifestFiles.filter((mf) => !goes.has(mf.relPath)).map((mf) => {
    if (!children.has(mf.relPath)) return mf;
    const content = copyJson(mf.content);
    setPlateauContentKey(content, 'override', parent === BASELINE_PLATEAU ? '' : parent);
    return Object.assign({}, mf, { content });
  });
  const after = buildPlateauTree(files);
  const effects = { files, tree: after, above: [], breaks: [], before: new Map(), after: new Map() };
  const standing = tree.ids.filter((other) => layerIsBelow(other, id));
  if (standing.length) {
    if (after.problems.length) {
      effects.breaks = after.problems.map(String);
    } else {
      const context = { byPlateau: layerManifestsByPlateau(files), kernel: loadedKernel, layered: !!after.layered };
      const resolve = (plateau) => {
        if (effects.after.has(plateau)) return effects.after.get(plateau);
        const at = after.nodes.get(plateau);
        const above = standing.includes(at.parent) ? resolve(at.parent) : layerStateOf(at.parent, settings);
        const result = above.fatal ? above : resolveLayerStep(above.state, at, context);
        effects.after.set(plateau, result);
        return result;
      };
      const sentencesOf = (result) => (result.fatal ? (result.earlier ? result.earlier.sentences : []) : result.state.problems ? result.state.problems.sentences : []);
      const breaks = [];
      for (const plateau of standing) {
        const then = layerStateOf(plateau, settings);
        const now = resolve(plateau);
        effects.before.set(plateau, then);
        // what `judgeLayerWrite` refuses: a plateau that resolved and no longer does (told once, by the plateau whose own patches fail), a sentence it did not have
        if (now.fatal && !then.fatal && now.plateau === plateau) breaks.push('the plateau `' + plateau + '` could no longer be resolved (' + oneLine(now.fatal[0]) + ')');
        const known = sentencesOf(then).map(comparableSentence);
        for (const sentence of sentencesOf(now)) if (!known.includes(comparableSentence(sentence))) breaks.push(oneLine(sentence));
        const entry = { id: plateau, parent: tree.nodes.get(plateau).parent, newParent: after.nodes.get(plateau).parent, lost: null, back: null, changed: null, unknown: !!then.fatal };
        if (!then.fatal && !now.fatal) {
          const was = graphReferencesOf(then.state.graph);
          const is = graphReferencesOf(now.state.graph);
          const own = (element) => { const copy = Object.assign({}, element); delete copy.elements; return copy; };
          entry.lost = {}; entry.back = {}; entry.changed = {};
          for (const layer of LAYER_NAMES) {
            entry.lost[layer] = Array.from(was[layer].keys()).filter((reference) => !is[layer].has(reference)).sort(compareUnits);
            entry.back[layer] = Array.from(is[layer].keys()).filter((reference) => !was[layer].has(reference)).sort(compareUnits);
            entry.changed[layer] = Array.from(was[layer].keys()).filter((reference) => is[layer].has(reference) && !sameJson(own(was[layer].get(reference)), own(is[layer].get(reference)))).sort(compareUnits);
          }
        }
        effects.above.push(entry);
      }
      effects.breaks = Array.from(new Set(breaks));
    }
  }
  cache.deletions.set(id, effects);
  return effects;
}

/**
 * What a view (a saved view, or the recipe a step carries) draws that the plateau above `plateau` has now and would lose once the plateau is deleted: `[]` when it loses nothing
 * it draws. What `viewProblem` looks at: the element of a view, and for a map the elements it is pinned on, of which one is enough (a map that keeps one of its pins there loses
 * nothing). `entry` is the plateau's entry of `effects.above` (`lost` is null when it would not resolve: `plan.breaks` tells it then).
 */
function viewLosesInPlateauAbove(view, plateau, entry, effects) {
  if (!entry || !entry.lost || !view || !isPlainObject(view)) return [];
  const layer = viewLayerOf(view);
  const lost = new Set(entry.lost[layer]);
  const properties = isPlainObject(view.properties) ? view.properties : {};
  if (view.viewpoint === 'map') {
    const pinned = stringList(properties.pinned);
    const was = effects.before.get(plateau).state ? graphReferencesOf(effects.before.get(plateau).state.graph)[layer] : new Map();
    const kept = pinned.filter((reference) => was.has(reference) && !lost.has(reference));
    return pinned.length && !kept.length ? pinned.filter((reference) => lost.has(reference)) : [];
  }
  return typeof properties.element === 'string' && lost.has(properties.element) ? [properties.element] : [];
}

/** The elements a view names, with their layer: its element, or the elements a map is pinned on. */
function namedByView(view) {
  if (!view || !isPlainObject(view)) return [];
  const layer = viewLayerOf(view);
  const properties = isPlainObject(view.properties) ? view.properties : {};
  if (view.viewpoint === 'map') return stringList(properties.pinned).map((reference) => ({ layer, reference }));
  return typeof properties.element === 'string' ? [{ layer, reference: properties.element }] : [];
}

/** Whether the plateau a step is told at (`at`, else the plateau drawn) still has `reference` once the plateau is deleted: what the plateau above has now, less what it would lose. */
function survivesWhereTold(layer, reference, at, byId, effects) {
  const id = at !== null ? at : AppState.layers ? AppState.layers.current : null;
  const entry = id === null ? undefined : byId.get(id);
  const then = entry && entry.lost ? effects.before.get(id) : undefined;
  if (then && then.state) return graphReferencesOf(then.state.graph)[layer].has(reference) && !entry.lost[layer].includes(reference);
  return indexOfPlateau(at)[layer].has(reference);
}

/**
 * What the views and the stories that stay would lose in the plateaus above the deleted one, one sentence each (the plateau-free check, `entryProblemsIn`, tells the names no
 * plateau declares any more; this tells a plateau above that has what they draw now and would not):
 *   - a step told at a plateau above (`at`, run 0132): the step could be drawn there and no longer could (`stepProblem` would say "is not in the plateau");
 *   - a step compared with a plateau above (`against`, wave 019 run 0139, #138): the comparison is drawn from the plateau the step is told at, so the step loses its view only when
 *     the plateau compared with would lose what it names and the plateau it is told at does not keep it either;
 *   - a saved view drawn in a plateau above (#138): it can be drawn there now and no longer could; one sentence per view, naming every such plateau in the order of the tree.
 * A step with neither key is drawn in whatever plateau the reader has, and is not told. In the order of the stories and their steps (`at`, then `against`), then the views.
 */
function stepsLosingTheirView(effects) {
  const out = [];
  if (!effects.above.length) return out;
  const byId = new Map(effects.above.map((entry) => [entry.id, entry]));
  const sourceOf = (entry) => { const owner = entryOwners.get(entry); return owner ? owner.relPath : '.archicode.yaml'; };
  for (const story of storiesList()) {
    const source = sourceOf(story);
    (Array.isArray(story.steps) ? story.steps : []).filter((step) => step !== null && step !== undefined).forEach((step, i) => {
      if (!isPlainObject(step)) return;
      const keys = stepPlateauKeys(step);
      const where = 'the story `' + story.id + '` (`' + source + '`) step ' + (i + 1);
      for (const [key, words] of [['at', 'is told at'], ['against', 'is compared with']]) {
        const plateau = keys[key];
        const view = stepView(step);
        let gone = plateau === null ? [] : viewLosesInPlateauAbove(view, plateau, byId.get(plateau), effects);
        // a plateau only compared with does not have to hold what the step draws: the comparison is drawn from the plateau the step is told at, so the step loses its view only
        // when that side does not keep what it names either
        if (key === 'against' && gone.length && namedByView(view).some((one) => survivesWhereTold(one.layer, one.reference, keys.at, byId, effects))) gone = [];
        if (gone.length) out.push(where + ' ' + words + ' `' + plateau + '`, which would no longer have ' + plateauNames(gone, true));
      }
    });
  }
  for (const view of savedViews()) {
    const lost = effects.above.map((entry) => ({ plateau: entry.id, gone: viewLosesInPlateauAbove(view, entry.id, entry, effects) })).filter((one) => one.gone.length);
    if (!lost.length) continue;
    const gone = Array.from(new Set(lost.flatMap((one) => one.gone))).sort(compareUnits);
    out.push('the view `' + view.id + '` (`' + sourceOf(view) + '`) is drawn in ' + lost.map((one) => '`' + one.plateau + '`').join(', ') + ', which would no longer have ' + plateauNames(gone, true));
  }
  return out;
}

/** The sentence that refuses a delete for what the plateaus above would say (`plan.breaks`) or for what the files that stay would say (`plan.blocking`), naming the first of them. */
function plateauDeletionBlockedMessage(plan) {
  if (plan.breaks.length) {
    return 'The plateau `' + plan.id + '` cannot be deleted: ' + (plan.breaks.length === 1 ? 'a plateau that stands on it would no longer be valid' : plan.breaks.length + ' mistakes would appear in the plateaus that stand on it') +
      ' (' + oneLine(plan.breaks[0]).replace(/\.$/, '') + '). Repair ' + (plan.breaks.length === 1 ? 'it' : 'them') + ' first, or give the plateaus that override `' + plan.id + '` another parent with Edit.';
  }
  return 'The plateau `' + plan.id + '` cannot be deleted: ' + (plan.blocking.length === 1 ? 'a view or a story would no longer be valid' : plan.blocking.length + ' views or story steps would no longer be valid') +
    ' (' + oneLine(plan.blocking[0]).replace(/\.$/, '') + '). Change ' + (plan.blocking.length === 1 ? 'it' : 'them') + ' in Stories first.';
}

/**
 * Deletes the plateau `id` (see `plateauDeletion`): its files leave the model and are queued for removal, the plateaus that override it are given the plateau it overrode
 * (their `override` is rewritten, or taken out when that is the root), a `settings.current` that names it is taken out, and the page draws the plateau it overrode when it
 * was the one drawn (with no comparison), compares the plateau drawn with its new parent when it compared it with its past, or stops the comparison when it was the one
 * compared with otherwise. Under `guardedLayerWrite`: every plateau that stays is resolved again, and the delete is kept only if none is refused that was not, else everything
 * is put back (the files, the `override` rewritten, the queue of removals, the settings, the plateau drawn). `options.listed`: the dialog of the delete has told the author what
 * the plateaus above lose (`plan.above`), so a change of those plateaus is not asked again; a change of any other one still is. Returns `{ removed, rewritten, current, drawn }`,
 * or `{ pending: true }` when the dialog of the plateaus it changes is open.
 */
function commitPlateauDelete(id, options) {
  if (saveInFlight) throw new Error('The folder is being saved: delete the plateau once the save has ended.');
  const plan = plateauDeletion(id);
  if (plan.refusal) throw new Error(plan.refusal);
  if (plan.breaks.length || plan.blocking.length) throw new Error(plateauDeletionBlockedMessage(plan));
  const goes = new Set(plan.files.map((f) => f.relPath));
  const parent = plan.parent;
  const drawingBefore = AppState.layers.current + '|' + layerCompareChoice();
  const result = guardedLayerWrite({
    plateau: id,
    confirmed: !!(options && options.confirmed),
    confirmedFor: options && options.listed ? plan.above.map((entry) => entry.id) : null,
    summary: 'Delete the plateau `' + id + '`',
    again: () => commitPlateauDelete(id, Object.assign({}, options, { confirmed: true })),
    write: () => {
      // the plateaus that override it go under its parent: the key `override` of their manifest of kind plateau, written line by line as Edit writes it (none for the root)
      for (const { id: child, relPath } of plan.rewritten) {
        const mf = AppState.manifestFiles.find((file) => file.relPath === relPath);
        if (!mf || !mf.content || String(mf.content.id) !== child) throw new Error('Not written: the manifest of the plateau `' + child + '` was not found. Nothing was changed.');
        setPlateauContentKey(mf.content, 'override', parent === BASELINE_PLATEAU ? '' : parent);
        touchManifest(mf);
      }
      for (const mf of AppState.manifestFiles) {
        if (!goes.has(mf.relPath)) continue;
        if (mf.existedOnDisk && !AppState.pendingFileRemovals.includes(mf.relPath)) { // a file that is not on disk yet just leaves the model
          AppState.pendingFileRemovals.push(mf.relPath);
          AppState.removedFileBaselines.set(mf.relPath, mf.lastKnownDiskModified); // the save checks the disk did not change since
        }
        if (rawYamlEditDraft && rawYamlEditDraft.relPath === mf.relPath) rawYamlEditDraft = null;
        if (AppState.selection.kind === 'file' && AppState.selection.key === mf.relPath) AppState.selection = { kind: 'none', key: null, mode: 'view' };
      }
      // the marks of what is modified, for a reference no file that stays declares (a plateau beside it may declare the same one: its mark stays)
      const declaredAfter = declaredReferencesOf(AppState.manifestFiles.filter((mf) => !goes.has(mf.relPath)));
      for (const mf of AppState.manifestFiles) {
        const layer = goes.has(mf.relPath) ? manifestLayer(mf) : null;
        if (layer) walkContentNodes(mf, (node, reference) => { if (!declaredAfter[layer].has(reference)) AppState.dirtyReferences.delete(nodeKey(reference, layer)); });
      }
      AppState.manifestFiles = AppState.manifestFiles.filter((mf) => !goes.has(mf.relPath));
      if (plan.current !== null) {
        const raw = AppState.workspace.topLevel && AppState.workspace.topLevel.settings;
        if (isPlainObject(raw)) delete raw.current; // .archicode.yaml is written line by line: the line of the key goes, nothing else
        AppState.workspace.settings.current = '';
        markWorkspaceYamlChanged();
      }
      const layers = AppState.layers;
      if (layers.current === id) {
        layers.current = parent; // the plateau it overrode: what the author built it on
        layers.compare = null;
      } else if (layers.compare && layers.compare.other === id && layers.compare.mode !== 'past') {
        layers.compare = null;
      } // the past of a plateau that overrode it follows it to its new parent (`normalizedLayerCompare`)
      pendingDeleteConfirmation = null;
      saveStatus = { state: 'idle' };
      rebuildIndexAndRender();
      return { removed: Array.from(goes).sort(compareCodePoints), rewritten: plan.rewritten.map((r) => r.relPath), current: plan.current, drawn: layers.current };
    },
    verify: () => {
      if (AppState.plateauTree.nodes.has(id) || AppState.manifestFiles.some((mf) => goes.has(mf.relPath))) throw new Error('Not written: the plateau `' + id + '` is still read after the delete. Nothing was changed.');
      // the tree reads as the dialog said: each plateau that overrode it now overrides its parent
      const strayed = plan.overriding.find((child) => !AppState.plateauTree.nodes.has(child) || AppState.plateauTree.nodes.get(child).parent !== parent);
      if (strayed) throw new Error('Not written: the plateau `' + strayed + '` does not read back as a plateau over `' + parent + '`. Nothing was changed.');
    }
  });
  // another plateau drawn, or no comparison: remembered as it is now, and what the page held of the plateau drawn before is let go. The address is rewritten, not added to
  // the history (the plateau it named is gone)
  if (!result.pending && AppState.layers.current + '|' + layerCompareChoice() !== drawingBefore) {
    rememberLayerChoice();
    settleAfterLayerChange(false);
    render();
  }
  return result;
}

/** The dialog that deletes a plateau: it says what goes before anything goes. */
function openPlateauDeleteDialog(id) {
  if (!AppState.layers || !AppState.plateauTree || !AppState.plateauTree.nodes.has(id)) return;
  openAppDialog({ kind: 'plateau-delete', plateau: id });
}

/** The body and the buttons of the dialog of `openPlateauDeleteDialog`, from `plateauDeletion` (computed each time it is drawn). */
function renderPlateauDeleteDialogHtml(dialog) {
  const plan = plateauDeletion(dialog.plateau);
  const title = 'Delete the plateau ' + plateauTitle(layerPlateauModel(dialog.plateau));
  const cancel = (focus) => '<button type="button" data-action="dialog-cancel"' + (focus ? ' class="btn-primary" data-dialog-autofocus' : '') + '>' + (focus ? 'Close' : 'Cancel') + '</button>';
  const code = (text) => '<code>' + escapeHtml(text) + '</code>';
  const list = (items) => '<ul class="layer-confirm-list">' + items.join('') + '</ul>';
  if (plan.refusal) return { title, body: '<p class="app-dialog-subject">' + duplicateMessageHtml(plan.refusal) + '</p>', actions: cancel(true) };
  const fileItem = (f) => '<li>' + code(f.relPath) + (f.plateau ? ' <span class="muted">the manifest of the plateau</span>' : '') +
    (f.unsaved ? ' <span class="muted">(new, not saved yet)</span>' : f.modified ? ' <strong>(modified, not saved: the changes go with it)</strong>' : '') + '</li>';
  const middle = plan.overriding.length > 0; // a plateau that others override (run 0132, #112): their `override` changes too, and the dialog says what each plateau above loses
  let body = '<p class="app-dialog-subject">' + code(dialog.plateau) + (plan.files.length ? '' : ' has no file.') + '</p>';
  if (plan.files.length) body += '<p>' + (plan.files.length === 1 ? 'This file goes' : 'These ' + plan.files.length + ' files go') + (middle ? ':' : ', and nothing else:') + '</p>' + list(plan.files.map(fileItem));
  if (middle) {
    const titled = (other) => code(other) + (layerPlateauModel(other).name ? ' ' + escapeHtml(layerPlateauModel(other).name) : '');
    body += '<p>' + (plan.rewritten.length === 1 ? 'This file changes' : 'These ' + plan.rewritten.length + ' files change') + (plan.files.length ? ', and nothing else' : '') + ': the ' + (plan.rewritten.length === 1 ? 'plateau that overrides' : 'plateaus that override') + ' ' + code(dialog.plateau) + ' ' + (plan.rewritten.length === 1 ? 'goes' : 'go') + ' under ' + code(plan.parent) + '.</p>' +
      list(plan.rewritten.map((r) => '<li data-plateau="' + escapeHtml(r.id) + '">' + code(r.relPath) + ' ' + (plan.parent === BASELINE_PLATEAU ? 'loses the line <code>override: ' + escapeHtml(dialog.plateau) + '</code> (a plateau that says none overrides the root)' : 'says <code>override: ' + escapeHtml(plan.parent) + '</code> instead of <code>override: ' + escapeHtml(dialog.plateau) + '</code>') + '</li>'));
    const refs = (references) => references.map(code).join(', ');
    const count = (n, what) => n + ' ' + what + (n === 1 ? '' : 's');
    const lines = (entry) => {
      if (entry.unknown) return ['<li data-what="unknown">could not be resolved before the delete: what it loses is not known</li>'];
      if (!entry.lost) return ['<li data-what="broken">would no longer resolve (see below)</li>'];
      const out = [];
      for (const layer of LAYER_NAMES) {
        const where = layer === 'technology' ? ' of the technology layer' : '';
        if (entry.lost[layer].length) out.push('<li data-what="lost" data-layer="' + layer + '">loses ' + count(entry.lost[layer].length, 'element') + where + ': ' + refs(entry.lost[layer]) + '</li>');
        if (entry.back[layer].length) out.push('<li data-what="back" data-layer="' + layer + '">gets back ' + count(entry.back[layer].length, 'element') + where + ' that ' + code(dialog.plateau) + ' removed: ' + refs(entry.back[layer]) + '</li>');
        if (entry.changed[layer].length) out.push('<li data-what="changed" data-layer="' + layer + '">reads ' + count(entry.changed[layer].length, 'element') + where + ' differently, without what the patches of ' + code(dialog.plateau) + ' did to ' + (entry.changed[layer].length === 1 ? 'it' : 'them') + ': ' + refs(entry.changed[layer]) + '</li>');
      }
      return out.length ? out : ['<li data-what="nothing">loses nothing</li>'];
    };
    body += '<p>Nothing that ' + code(dialog.plateau) + ' declares' + (plan.patches ? ', nor its ' + (plan.patches === 1 ? 'patch' : plan.patches + ' patches') + ',' : '') + ' reaches the plateaus that stand on it any more. Each of them, resolved again without it:</p>' +
      '<ul class="layer-confirm-list plateau-delete-above">' + plan.above.map((entry) => '<li data-plateau="' + escapeHtml(entry.id) + '">' + titled(entry.id) + ', over ' + code(entry.newParent) +
        (entry.newParent !== entry.parent ? ' instead of ' + code(entry.parent) : '') + ':<ul>' + lines(entry).join('') + '</ul></li>').join('') + '</ul>';
  }
  if (plan.breaks.length || plan.blocking.length) {
    if (plan.breaks.length) {
      body += '<p><strong>It cannot be deleted yet:</strong> once it is gone, ' + (plan.breaks.length === 1 ? 'this sentence would be a mistake' : 'these sentences would be mistakes') + ' of the plateaus that stand on it, which the command line refuses. Repair ' + (plan.breaks.length === 1 ? 'it' : 'them') + ' first, or give the plateaus that override ' + code(dialog.plateau) + ' another parent with Edit.</p>' +
        list(plan.breaks.map((sentence) => '<li>' + duplicateMessageHtml(sentence) + '</li>'));
    }
    if (plan.blocking.length) {
      body += '<p><strong>It cannot be deleted yet:</strong> once these files are gone, ' + (plan.blocking.length === 1 ? 'this sentence would be' : 'these sentences would be') + ' a mistake for the command line and the editor. Change ' + (plan.blocking.length === 1 ? 'it' : 'them') + ' in Stories first.</p>' +
        list(plan.blocking.map((sentence) => '<li>' + duplicateMessageHtml(sentence) + '</li>'));
    }
    return { title, body, actions: cancel(true) };
  }
  if (plan.current !== null) body += '<p><code>settings.current</code> names ' + code(plan.current) + ': the key is taken out of <code>.archicode.yaml</code> (the command line then draws the last plateau when the plateaus are one line, and asks for <code>--plateau</code> otherwise).</p>';
  if (plan.unread.length) body += '<p>The editor does not read ' + (plan.unread.length === 1 ? 'this file' : 'these files') + ' (TOML, JSON, or YAML it could not read), so ' + (plan.unread.length === 1 ? 'it is' : 'they are') + ' not deleted' + (middle ? ' nor rewritten' : '') + ': if one says <code>plateau: ' + escapeHtml(dialog.plateau) + '</code>' + (middle ? ' or <code>override: ' + escapeHtml(dialog.plateau) + '</code>' : '') + ', the command line still reads the plateau. Look at ' + (plan.unread.length === 1 ? 'it' : 'them') + ' in a text editor.</p>' + list(plan.unread.map((relPath) => '<li>' + code(relPath) + '</li>'));
  if (plan.kept.length) body += '<p>' + (plan.kept.length === 1 ? 'This view or story says' : 'These views and stories say') + ' <code>plateau: ' + escapeHtml(dialog.plateau) + '</code> in the header, which names no plateau: ' + (plan.kept.length === 1 ? 'it stays' : 'they stay') + '.</p>' + list(plan.kept.map((relPath) => '<li>' + code(relPath) + '</li>'));
  const views = viewsFolderName();
  if (views) body += '<p class="muted">The views the command line generated for it (' + code(views + '-' + dialog.plateau) + ' and the folders of its comparisons) are not manifests: they stay where they are.</p>';
  body += '<p>The files leave the disk at the next “Save all changes”.' + (AppState.layers.current === dialog.plateau ? ' The plateau it overrides, ' + code(AppState.plateauTree.nodes.get(dialog.plateau).parent) + ', is drawn instead.' : '') + '</p>';
  return { title, body, actions: cancel(false) + '<button type="button" class="btn-danger-solid" data-action="dialog-submit">Delete plateau</button>' };
}

/** The name of the folder of the generated views (`views.path`), or null when it is not a plain relative folder. */
function viewsFolderName() {
  const path = AppState.workspace && AppState.workspace.settings.views ? AppState.workspace.settings.views.path : null;
  if (typeof path !== 'string' || plateauPathProblem(path)) return null;
  return path.replace(/\/+$/, '').replace(/^\.\//, '');
}

/**
 * Build the application/technology element indexes from every
 * successfully-parsed manifest file (DEC-5/FR-6). Mutates manifestFiles'
 * entries in place to record a per-file error for an unrecognized
 * header.kind (DEC-10), without aborting the rest of the load.
 *
 * DEC-5b: a manifest's root element is only a *candidate* top-level root.
 * After every manifest is indexed, a second pass looks up each root's own
 * `header.parent` (if any) in the same-layer index and, when found,
 * attaches that root under the found parent's `children` instead of
 * leaving it at the top level — mirroring the real
 * `ElementIndexFactory.create()`'s cross-manifest attachment loop. In
 * `.custom`, this is how `auth`/`access`/`portal`/etc. end up nested under
 * `platform` even though `app.platform.yaml` itself declares no
 * `content.elements` — the nesting is entirely cross-file.
 */
function buildIndex(manifestFiles, settings) {
  const index = { application: new Map(), technology: new Map() };
  const candidateRoots = { application: [], technology: [] }; // { record, parentReference }
  // what each plateau declares, by plateau: reference (id, for a view and a story) -> the files that declare it, by layer. Until the plateaus are
  // loaded as layers (run 0077), the index holds the manifests of `baseline` alone; the others are read, checked, and not drawn
  const declarationsByPlateau = new Map();
  const declarationsOf = (plateau) => {
    if (!declarationsByPlateau.has(plateau)) declarationsByPlateau.set(plateau, { application: new Map(), technology: new Map() });
    return declarationsByPlateau.get(plateau);
  };
  // a view and a story belong to no plateau (wave 015, run 0100): each is declared once in the whole workspace
  const untied = { view: new Map(), story: new Map() };

  for (const mf of manifestFiles) {
    if (mf.error) continue;
    if (!mf.header || !mf.header.kind || !mf.content || mf.content.id === undefined) {
      mf.error = mf.error || 'Missing header.kind or content.id';
      continue;
    }
    const bareKind = stripArchicodeKindPrefix(mf.header.kind);
    if (bareKind === 'plateau') continue; // a manifest, not an element: the tree of plateaus is built below
    if (bareKind === 'view' || bareKind === 'story') { // manifests, but not elements: see "Stories"
      const id = String(mf.content.id);
      if (!untied[bareKind].has(id)) untied[bareKind].set(id, []);
      untied[bareKind].get(id).push(mf.relPath);
      continue;
    }
    const plateau = plateauOfManifest(mf);
    const declarations = declarationsOf(plateau);
    const mapping = ARCHICODE_KIND_MAP[bareKind];
    if (!mapping) {
      mf.error = unrecognizedKindProblem(mf.header.kind);
      continue;
    }
    const { category, rootKind } = mapping;
    // DEC-3: the root's own nesting-rule level is its kind
    const rootLevel = rootKind;
    const rootReference = mf.header.parent
      ? (mf.header.parent + '.' + mf.content.id)
      : String(mf.content.id);
    // the elements of another plateau are walked to tell what they declare, into an index of their own that nothing reads
    const into = plateau === BASELINE_PLATEAU ? index : { application: new Map(), technology: new Map() };
    const rootRecord = indexElementRecursive(mf.content, rootKind, rootReference, mf.relPath, category, into, settings, rootLevel, declarations);
    if (plateau === BASELINE_PLATEAU) candidateRoots[category].push({ record: rootRecord, parentReference: mf.header.parent || null });
  }

  // DEC-5b: attach each candidate root under its resolved parent (if any);
  // only unattached candidates remain top-level.
  const rootsByCategory = { application: [], technology: [] };
  for (const category of ['application', 'technology']) {
    for (const candidate of candidateRoots[category]) {
      const parentRecord = candidate.parentReference ? index[category].get(candidate.parentReference) : null;
      if (parentRecord) {
        parentRecord.children.push(candidate.record);
      } else {
        rootsByCategory[category].push(candidate.record);
      }
    }
  }

  const plateauTree = buildPlateauTree(manifestFiles);
  checkPlateauRedeclarations(plateauTree, declarationsByPlateau);
  return { index, rootsByCategory, duplicates: findDuplicateReferences(Array.from(declarationsByPlateau.values()).concat([Object.assign({ application: new Map(), technology: new Map() }, untied)])), plateauTree };
}

/**
 * The message for a reference declared more than once, naming the reference and the files. The wording is the one of the
 * command line (`ManifestParser.duplicateMessage`): keep them alike. Files are in code-unit order, as Java sorts them.
 */
function duplicateReferenceMessage(reference, sources, noun) {
  noun = noun || 'reference';
  const counts = new Map();
  for (const source of sources) counts.set(source, (counts.get(source) || 0) + 1);
  const times = sources.length === 2 ? 'twice' : sources.length + ' times';
  if (counts.size === 1) return 'the ' + noun + ' `' + reference + '` is declared ' + times + ' in `' + sources[0] + '`';
  const files = Array.from(counts.keys()).sort().map((file) => {
    const n = counts.get(file);
    return '`' + file + '`' + (n === 1 ? '' : n === 2 ? ' (twice)' : ' (' + n + ' times)');
  });
  return 'the ' + noun + ' `' + reference + '` is declared ' + times + ': in ' + files.slice(0, -1).join(', ') + ' and ' + files[files.length - 1];
}

/**
 * The references declared more than once in a layer of a plateau (by two files, by a file and an element nested in another, or twice in
 * one file; `declarationsOfPlateaus` is one set of declarations for each plateau, since two plateaus that do not stack may declare the same reference), and the views and stories (`layer` is then `view` or `story`) that share an id, as `[{ layer, reference, sources, message }]`, by reference. A reference may exist in both
 * layers: that is no duplicate. The command line fails on the same set.
 */
function findDuplicateReferences(declarationsOfPlateaus) {
  const found = [];
  for (const declarations of declarationsOfPlateaus) {
    for (const layer of ['application', 'technology', 'view', 'story']) {
      const noun = layer === 'view' || layer === 'story' ? layer : 'reference'; // a view and a story have an id of their own
      for (const [reference, sources] of declarations[layer] || []) {
        if (sources.length > 1) found.push({ layer, reference, sources: sources.slice(), message: duplicateReferenceMessage(reference, sources, noun) });
      }
    }
  }
  found.sort((a, b) => compareUnits(a.reference, b.reference) || compareUnits(a.message, b.message)); // code units, as Java orders a String
  // the same reference told twice, with the same files, in both layers: said once, as the command line does
  return found.filter((d, i) => i === 0 || d.message !== found[i - 1].message);
}

/**
 * Walk every indexed element's relationships and mark each `resolved`
 * per DEC-5: application relationships resolve only against the
 * application index, technology only against technology, never
 * cross-layer (FR-7, FLOW-4).
 */
function resolveRelationships(index) {
  let total = 0;
  let dangling = 0;
  for (const category of ['application', 'technology']) {
    for (const record of index[category].values()) {
      for (const rel of record.relationships) {
        total++;
        rel.resolved = index[category].has(rel.destination);
        if (!rel.resolved) dangling++;
      }
    }
  }
  return { total, dangling };
}

// =====================================================================
// Workspace + manifest loading (TDD FLOW-1; PRD FR-4/FR-5/FR-16/DEC-10).
// =====================================================================

/**
 * A relative directory path as the editor writes it: segments joined by '/', with the empty and '.' ones dropped
 * (`./manifests`, `manifests/` and `manifests` are one directory; `.` is the folder itself, ''). Null when the path
 * leaves the folder (`..`) or is not a string.
 */
function normalizeRelDir(relDir) {
  if (typeof relDir !== 'string') return null;
  const segments = relDir.split('/').filter((seg) => seg !== '' && seg !== '.');
  return segments.includes('..') ? null : segments.join('/');
}

/**
 * The folder a new manifest is written to: the first manifests directory of the workspace (as loadWorkspace reads it: `./manifests` is `manifests`);
 * undefined when there is none.
 */
function firstManifestsDir() {
  return AppState.workspace.settings.manifests.paths.map((p) => normalizeRelDir(manifestsFolderOf(p))).find((p) => p !== null);
}

/** Resolve a (possibly multi-segment) relative directory path from a root handle; `options.create` makes the missing directories. */
async function getDirectoryHandleByRelativePath(rootHandle, relPath, options) {
  const normalized = normalizeRelDir(String(relPath));
  if (normalized === null) throw new Error('The path "' + relPath + '" is outside the folder.');
  let current = rootHandle;
  for (const seg of normalized.split('/').filter(Boolean)) {
    current = await current.getDirectoryHandle(seg, options && options.create ? { create: true } : undefined);
  }
  return current;
}

