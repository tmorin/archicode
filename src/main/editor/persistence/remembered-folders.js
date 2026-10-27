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
        try {
          tx.abort();
        } catch (ignored) {
          /* already finished */
        }
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
  return {
    id: record.id,
    handle: record.handle,
    name: typeof record.name === 'string' ? record.name : '',
    openedAt: Number(record.openedAt) || 0
  };
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
      store.get(ARCHICODE_LAST_FOLDER_KEY).onsuccess = (e) => {
        out.last = e.target.result || null;
      };
      store.getAll().onsuccess = (e) => {
        out.folders = (e.target.result || []).filter(isFolderRecord);
      };
      return out;
    });
  } catch (e) {
    console.error('ArchiCode: the remembered folders could not be read; trying the last folder alone', e);
    return withArchicodeStore('readonly', (store) => {
      const out = { folders: [], last: null, complete: false };
      store.get(ARCHICODE_LAST_FOLDER_KEY).onsuccess = (ev) => {
        out.last = ev.target.result || null;
      };
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
      if (await isSameFolder(candidate[0].handle, folder.handle)) {
        group = candidate;
        break;
      }
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
          store.put(
            Object.assign({}, state.survivor, { name: merged.name, openedAt: merged.openedAt }),
            folderKey(merged.id)
          );
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
      console.error(
        'ArchiCode: the records of one remembered folder could not be merged; it is listed once all the same',
        e
      );
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
  const entry = same || {
    id: lastRecord.id || newFolderId(),
    handle: lastRecord.handle,
    name: '',
    openedAt: Date.now()
  };
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
    const last = {
      id: lastRecord.id || null,
      handle: lastRecord.handle,
      name: '',
      openedAt: Date.now(),
      legacy: !lastRecord.id
    };
    return { folders: [last], last, merged };
  }
  // the pointer may name a record a failed merge left beside its folder's entry (`others`): it is that folder
  let last =
    folders.find((f) => f.id === lastRecord.id || (lastRecord.id && (f.others || []).includes(lastRecord.id))) || null;
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
    entry =
      (known && known.id ? folders.find((f) => f.id === known.id) : null) || (await findSameFolder(handle, folders));
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
  const replaced = (f) =>
    f.id === kept.id || f.id === fresh.id || merged.has(f.id) || f === known || !!(f.legacy && known && known.legacy);
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
