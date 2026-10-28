// =====================================================================
// The browser workspace store (wave 025, run 0192, TDD-0192 DEC-1 to DEC-3, DEC-6 to DEC-8, CTR-1, CTR-2): a third implementation of the
// directory-handle interface the editor uses (the first is the browser's own, the second `serverDirectoryHandle`), backed by a second
// IndexedDB database, `archicode-browser-workspaces`, version 1, one object store `records` with out-of-line string keys:
//   'workspace:<id>'      -> { kind: 'workspace', id, name, createdAt, openedAt, lastExportAt: null | ms, origin, sample? }  (sample: only for origin 'sample', the id of the sample)
//   'file:<id>/<path>'    -> { kind: 'file', workspace: id, path, bytes: Uint8Array, modified: ms }
//   'last'                -> { id, openedAt }   the workspace the browser reopens
// The remembered folders' database (`archicode-standalone-editor`) is never opened here. Directories are implicit: one exists while a file
// is under it. A record of an unknown kind is ignored by a listing and never deleted, so a later page can add kinds.
// Pure persistence: no DOM, no drawing, no AppState; the only page state it writes is browserStoreState and the two flags of the request for
// persistent storage, which live in model/app-state.js. Every operation opens the database itself and closes it.
// =====================================================================

/* exported probeBrowserStore, listBrowserWorkspaces, createBrowserWorkspace, renameBrowserWorkspace, deleteBrowserWorkspace,
   readBrowserLast, writeBrowserLast, clearBrowserLast, markBrowserExport, browserWorkspaceNameProblem, browserDirectoryHandle,
   askForPersistentStorage --
   the entry points of the store: the flows of application/browser-workspaces.js and the save call them (run 0192, tasks 007 and 008). */

const BROWSER_DB_NAME = 'archicode-browser-workspaces';
const BROWSER_DB_VERSION = 1;
const BROWSER_STORE_NAME = 'records';
const BROWSER_LAST_KEY = 'last';
const BROWSER_WORKSPACE_PREFIX = 'workspace:';
const BROWSER_FILE_PREFIX = 'file:';
const BROWSER_NAME_MAX = 80;
const BROWSER_UNREADABLE = 'could not be read';

function browserError(name, message) {
  const error = new Error(message);
  error.name = name;
  error.isBrowserStoreError = true; // the sentences of this store: a caller that wraps browser errors leaves these whole
  return error;
}

/** DEC-6: the sentence of a write (or a read) whose workspace is no longer there. `name` is the one the handle was made with, '' when unknown. */
function browserWorkspaceGone(ownerName) {
  const subject = ownerName ? 'The workspace “' + ownerName + '”' : 'The workspace';
  const error = browserError(
    'NotFoundError',
    subject + ' is no longer in this browser: it was deleted, possibly in another tab. Nothing was written.'
  );
  error.workspaceGone = true; // the flows tell it from a missing file (application/browser-workspaces.js, browserEditorRoot)
  return error;
}

function browserEntryMissing(entryName) {
  return browserError('NotFoundError', 'There is no file or folder “' + entryName + '” here.');
}

function browserEntryMismatch(entryName, wanted) {
  return browserError('TypeMismatchError', '“' + entryName + '” is not a ' + wanted + '.');
}

// ---- the name rule (DEC-7): the one place that owns it ----

/**
 * The one sentence that says why `name` cannot be the name of a workspace, or null. A name is trimmed, 1 to 80 characters, holds no control
 * character and is unique among `otherNames` without regard to case. The flows show the sentence under the field; create and rename run this
 * again inside their transaction, with the names that are stored.
 */
function browserWorkspaceNameProblem(name, otherNames) {
  if (typeof name !== 'string') return 'Give the workspace a name.';
  const trimmed = name.trim();
  if (trimmed === '') return 'Give the workspace a name.';
  if (/[\u0000-\u001f\u007f-\u009f]/.test(trimmed)) {
    return 'A workspace name cannot hold a line break or another control character.';
  }
  if (Array.from(trimmed).length > BROWSER_NAME_MAX) {
    return 'A workspace name is at most ' + BROWSER_NAME_MAX + ' characters.';
  }
  const lowered = trimmed.toLowerCase();
  if ((otherNames || []).some((other) => typeof other === 'string' && other.trim().toLowerCase() === lowered)) {
    return 'A workspace named “' + trimmed + '” already exists in this browser. Choose another name.';
  }
  return null;
}

function browserNameError(name, otherNames) {
  const sentence = browserWorkspaceNameProblem(name, otherNames);
  return sentence === null ? null : browserError('InvalidNameError', sentence);
}

/** Why a path cannot be stored (CTR-2: relative, `/` separated, no empty, `.` or `..` segment), or null. */
function browserPathProblem(filePath) {
  if (typeof filePath !== 'string' || filePath === '') return 'a file needs a path';
  if (filePath.startsWith('/') || filePath.includes('\\'))
    return 'the path “' + filePath + '” is not relative with `/`';
  if (filePath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return 'the path “' + filePath + '” has an empty, `.` or `..` segment';
  }
  return null;
}

// ---- the database and the transaction ----

function openBrowserDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(browserError('NotSupportedError', 'This browser does not offer IndexedDB.'));
      return;
    }
    let request;
    try {
      request = indexedDB.open(BROWSER_DB_NAME, BROWSER_DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BROWSER_STORE_NAME)) db.createObjectStore(BROWSER_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close(); // a later page that upgrades the database is never blocked by this one
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

/** A request callback that cannot throw into the transaction: what it throws aborts the transaction with that error (DEC-3). */
function browserStep(fail, callback) {
  return (event) => {
    try {
      callback(event);
    } catch (e) {
      fail(e);
    }
  };
}

/**
 * Runs `work(store, fail)` in one transaction on the store and resolves with what it returned once the transaction has committed. `work`
 * and its callbacks only queue requests and read results in `onsuccess`, never after an `await`. A throw inside them, or a call of
 * `fail(error)`, aborts the transaction, writes nothing and rejects with that error, its name and message kept (DEC-3); a request error
 * (quota) rejects with the browser's own error.
 */
async function withBrowserStore(mode, work) {
  const db = await openBrowserDb();
  try {
    return await new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction(BROWSER_STORE_NAME, mode);
      } catch (e) {
        reject(e);
        return;
      }
      let result;
      let failure = null;
      const fail = (error) => {
        if (failure === null) failure = error;
        try {
          tx.abort();
        } catch (ignored) {
          /* already finished */
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || new Error('the transaction was aborted'));
      try {
        result = work(tx.objectStore(BROWSER_STORE_NAME), fail);
      } catch (e) {
        fail(e);
      }
    });
  } finally {
    db.close();
  }
}

function isBrowserWorkspaceRecord(value) {
  return !!value && typeof value === 'object' && value.kind === 'workspace';
}

function isBrowserFileRecord(value) {
  return !!value && typeof value === 'object' && value.kind === 'file';
}

/**
 * One transaction on a workspace: reads its record first and fails with DEC-6's sentence if it is gone, otherwise calls
 * `work(store, record, out, fail)`; whatever `work` sets on `out.value` is what the promise resolves with.
 */
function withBrowserWorkspace(mode, workspaceId, ownerName, work) {
  return withBrowserStore(mode, (store, fail) => {
    const out = { value: undefined };
    store.get(BROWSER_WORKSPACE_PREFIX + workspaceId).onsuccess = browserStep(fail, (event) => {
      const record = event.target.result;
      if (!isBrowserWorkspaceRecord(record)) {
        fail(browserWorkspaceGone(ownerName));
        return;
      }
      work(store, record, out, fail);
    });
    return out;
  }).then((out) => out.value);
}

/** The names of the stored workspaces (but `exceptId`'s), read inside the transaction that checks a name against them. */
function readBrowserWorkspaceNames(store, fail, exceptId, then) {
  store.getAllKeys().onsuccess = browserStep(fail, (event) => {
    const keys = event.target.result.filter((key) => key.startsWith(BROWSER_WORKSPACE_PREFIX));
    const names = [];
    let left = keys.length;
    if (left === 0) {
      then(names);
      return;
    }
    keys.forEach((key) => {
      store.get(key).onsuccess = browserStep(fail, (ev) => {
        const value = ev.target.result;
        if (
          key !== BROWSER_WORKSPACE_PREFIX + exceptId &&
          isBrowserWorkspaceRecord(value) &&
          typeof value.name === 'string'
        ) {
          names.push(value.name);
        }
        left -= 1;
        if (left === 0) then(names);
      });
    });
  });
}

// ---- the probe ----

/** DEC-4: opens the database once and says whether the browser lets the editor keep a workspace; sets browserStoreState. */
async function probeBrowserStore() {
  try {
    const db = await openBrowserDb();
    db.close();
    browserStoreState = 'ready';
  } catch (e) {
    browserStoreState = {
      failed: (e && (e.message || e.name)) || 'the browser refused to open its storage'
    };
  }
  return browserStoreState;
}

// ---- the workspaces ----

function newBrowserWorkspaceId() {
  let random = '';
  while (random.length < 8) random += Math.random().toString(36).slice(2);
  return 'bw-' + Date.now().toString(36) + random.slice(0, 8);
}

/** A copy of any bytes, made in the page's own realm: the caller keeps its array and the store never aliases it. */
function browserBytesOf(source) {
  const view = ArrayBuffer.isView(source)
    ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
    : new Uint8Array(source);
  const copy = new Uint8Array(view.length);
  copy.set(view);
  return copy;
}

/**
 * One summary per workspace: the record's fields plus `fileCount` and `changedAt` (the latest `modified` of its files, else its creation),
 * most recently changed first. A record of the kind `workspace` that cannot be read is a summary with `problem`; a record of another kind,
 * or one that is not a record, is left out and left alone.
 */
async function listBrowserWorkspaces() {
  const read = await withBrowserStore('readonly', (store, fail) => {
    const out = { keys: [], values: [] };
    store.getAllKeys().onsuccess = browserStep(fail, (event) => {
      out.keys = event.target.result;
    });
    store.getAll().onsuccess = browserStep(fail, (event) => {
      out.values = event.target.result;
    });
    return out;
  });
  const files = new Map(); // workspace id -> { count, changedAt }
  const rows = [];
  read.keys.forEach((key, index) => {
    const value = read.values[index];
    if (key.startsWith(BROWSER_WORKSPACE_PREFIX)) {
      if (isBrowserWorkspaceRecord(value)) rows.push({ id: key.slice(BROWSER_WORKSPACE_PREFIX.length), value });
    } else if (key.startsWith(BROWSER_FILE_PREFIX)) {
      const slash = key.indexOf('/');
      if (slash < 0) return;
      const id = key.slice(BROWSER_FILE_PREFIX.length, slash);
      const seen = files.get(id) || { count: 0, changedAt: 0 };
      seen.count += 1;
      if (isBrowserFileRecord(value) && typeof value.modified === 'number') {
        seen.changedAt = Math.max(seen.changedAt, value.modified);
      }
      files.set(id, seen);
    }
  });
  return rows
    .map(({ id, value }) => {
      const seen = files.get(id) || { count: 0, changedAt: 0 };
      const readable = typeof value.name === 'string';
      const row = {
        id,
        name: readable ? value.name : '',
        createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
        openedAt: typeof value.openedAt === 'number' ? value.openedAt : 0,
        lastExportAt: typeof value.lastExportAt === 'number' ? value.lastExportAt : null,
        origin: typeof value.origin === 'string' ? value.origin : 'blank',
        sample: typeof value.sample === 'string' ? value.sample : null,
        fileCount: seen.count,
        changedAt: seen.changedAt || (typeof value.createdAt === 'number' ? value.createdAt : 0)
      };
      if (!readable) row.problem = BROWSER_UNREADABLE;
      return row;
    })
    .sort((a, b) => b.changedAt - a.changedAt || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * Creates a workspace and all its files in one transaction (DEC-9): `{ name, files: [{ path, bytes }], origin }`. The name is checked by the
 * rule above, again inside the transaction against the names that are stored. Resolves the record.
 */
async function createBrowserWorkspace(options) {
  const { name, files, origin, sample } = options || {};
  const early = browserNameError(name, []);
  if (early) throw early;
  const list = files || [];
  for (const file of list) {
    const problem = browserPathProblem(file && file.path);
    if (problem) throw browserError('InvalidPathError', 'A workspace cannot hold this file: ' + problem + '.');
  }
  const now = Date.now();
  const record = {
    kind: 'workspace',
    id: newBrowserWorkspaceId(),
    name: name.trim(),
    createdAt: now,
    openedAt: now,
    lastExportAt: null,
    origin: typeof origin === 'string' ? origin : 'blank'
  };
  if (record.origin === 'sample' && typeof sample === 'string') record.sample = sample; // which sample, to find it again by what it is (run 0193, DEC-6)
  const stored = list.map((file) => ({
    key: BROWSER_FILE_PREFIX + record.id + '/' + file.path,
    value: {
      kind: 'file',
      workspace: record.id,
      path: file.path,
      bytes: browserBytesOf(file.bytes),
      modified: now
    }
  }));
  await withBrowserStore('readwrite', (store, fail) => {
    readBrowserWorkspaceNames(store, fail, null, (names) => {
      const taken = browserNameError(record.name, names);
      if (taken) {
        fail(taken);
        return;
      }
      store.put(Object.assign({}, record), BROWSER_WORKSPACE_PREFIX + record.id);
      for (const file of stored) store.put(file.value, file.key);
    });
  });
  return Object.assign({}, record);
}

/** Changes the name of a workspace's record and nothing else (DEC-9); the name is checked again inside the transaction. */
async function renameBrowserWorkspace(id, name) {
  const early = browserNameError(name, []);
  if (early) throw early;
  const trimmed = name.trim();
  await withBrowserWorkspace('readwrite', id, '', (store, record, out, fail) => {
    readBrowserWorkspaceNames(store, fail, id, (names) => {
      const taken = browserNameError(trimmed, names);
      if (taken) {
        fail(taken);
        return;
      }
      store.put(Object.assign({}, record, { name: trimmed }), BROWSER_WORKSPACE_PREFIX + id);
    });
  });
}

/** DEC-7: removes the record, every file and `last` when it points at the workspace, in one transaction. A workspace that is gone is no error. */
async function deleteBrowserWorkspace(id) {
  await withBrowserStore('readwrite', (store, fail) => {
    let pointer = null;
    store.get(BROWSER_LAST_KEY).onsuccess = browserStep(fail, (event) => {
      pointer = event.target.result;
    });
    store.getAllKeys().onsuccess = browserStep(fail, (event) => {
      const own = BROWSER_FILE_PREFIX + id + '/';
      for (const key of event.target.result) {
        if (key === BROWSER_WORKSPACE_PREFIX + id || key.startsWith(own)) store.delete(key);
      }
      if (pointer && pointer.id === id) store.delete(BROWSER_LAST_KEY);
    });
    return null;
  });
}

// ---- the pointer to the workspace the browser reopens (DEC-5) ----

/** `{ id, openedAt }`, or null. Whether the workspace is still there is for the caller to find out. */
async function readBrowserLast() {
  const value = await withBrowserStore('readonly', (store, fail) => {
    const out = { value: null };
    store.get(BROWSER_LAST_KEY).onsuccess = browserStep(fail, (event) => {
      out.value = event.target.result || null;
    });
    return out;
  }).then((out) => out.value);
  return value && typeof value.id === 'string' && typeof value.openedAt === 'number'
    ? { id: value.id, openedAt: value.openedAt }
    : null;
}

/** Points `last` at a workspace that exists; touches no workspace record. */
async function writeBrowserLast(id) {
  await withBrowserWorkspace('readwrite', id, '', (store) => {
    store.put({ id, openedAt: Date.now() }, BROWSER_LAST_KEY);
  });
}

/** Closing a workspace: the pointer goes, the workspace stays. Clearing nothing is no error. */
async function clearBrowserLast() {
  await withBrowserStore('readwrite', (store) => {
    store.delete(BROWSER_LAST_KEY);
    return null;
  });
}

/** Records the time of an export (`at`: ms, now by default) on the workspace's record (W-5 calls it). */
async function markBrowserExport(id, at) {
  const stamp = typeof at === 'number' ? at : Date.now();
  await withBrowserWorkspace('readwrite', id, '', (store, record) => {
    store.put(Object.assign({}, record, { lastExportAt: stamp }), BROWSER_WORKSPACE_PREFIX + id);
  });
}

// ---- persistent storage (DEC-8) ----

/**
 * Asks the browser to keep the site's data, once per page session, without waiting for the answer (a prompt must not hold a save): the
 * answer is kept in browserStoragePersisted (`true`, `false`; null until there is one, and for ever where the browser has no such call).
 */
function askForPersistentStorage() {
  if (browserStorageAsked) return;
  browserStorageAsked = true;
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.persist !== 'function') return;
  try {
    Promise.resolve(navigator.storage.persist()).then(
      (answer) => {
        browserStoragePersisted = answer === true;
      },
      () => {}
    );
  } catch (ignored) {
    /* a browser that throws has no answer to keep */
  }
}

// ---- the handle (DEC-2, CTR-1) ----

function browserEntryNameProblem(entryName) {
  return (
    typeof entryName !== 'string' ||
    entryName === '' ||
    entryName === '.' ||
    entryName === '..' ||
    /[/\\]/.test(entryName)
  );
}

/** The bytes of one chunk of `write`: a string, a Blob, an ArrayBuffer, a typed array or `{ type: 'write', data }`. */
async function browserChunkBytes(chunk) {
  if (typeof chunk === 'string') return browserBytesOf(new TextEncoder().encode(chunk));
  if (ArrayBuffer.isView(chunk) || Object.prototype.toString.call(chunk) === '[object ArrayBuffer]') {
    return browserBytesOf(chunk);
  }
  if (chunk && typeof chunk.arrayBuffer === 'function') return browserBytesOf(await chunk.arrayBuffer());
  if (chunk && typeof chunk === 'object' && chunk.type === 'write') return browserChunkBytes(chunk.data);
  throw new TypeError('This file accepts text, a Blob, an ArrayBuffer or a typed array.');
}

/** A rejection of the browser (quota, abort) is told as DEC-3 says, with the browser's own name; the store's own sentences stay whole. */
function browserStoreFailure(filePath, error) {
  if (error && error.isBrowserStoreError) return error;
  const reason = error && error.message ? ' (' + error.message + ')' : '';
  return browserError(
    (error && error.name) || 'AbortError',
    'The browser could not store “' + filePath + '”' + reason + '. Nothing was changed.'
  );
}

/**
 * The directory `path` ('' for the root) of a workspace. `name` is the directory's own name; `ownerName` the workspace's, for the sentence
 * of DEC-6 (the root's `name` when omitted).
 */
function browserDirectoryHandle(workspaceId, path, name, ownerName) {
  const shownWorkspace = ownerName === undefined ? name : ownerName;
  const prefix = BROWSER_FILE_PREFIX + workspaceId + '/' + (path === '' ? '' : path + '/');
  const below = (entryName) => (path === '' ? entryName : path + '/' + entryName);
  const checkName = (entryName) => {
    if (browserEntryNameProblem(entryName)) {
      throw new TypeError('“' + entryName + '” is not the name of a file or a folder.');
    }
  };
  return {
    kind: 'directory',
    name,
    async *entries() {
      const keys = await withBrowserWorkspace('readonly', workspaceId, shownWorkspace, (store, record, out, fail) => {
        store.getAllKeys().onsuccess = browserStep(fail, (event) => {
          out.value = event.target.result.filter((key) => key.startsWith(prefix));
        });
      });
      const seen = new Set();
      for (const key of keys) {
        const rest = key.slice(prefix.length);
        const slash = rest.indexOf('/');
        const entryName = slash < 0 ? rest : rest.slice(0, slash);
        if (seen.has(entryName)) continue;
        seen.add(entryName);
        yield [
          entryName,
          slash < 0
            ? browserFileHandle(workspaceId, below(entryName), entryName, shownWorkspace)
            : browserDirectoryHandle(workspaceId, below(entryName), entryName, shownWorkspace)
        ];
      }
    },
    async getDirectoryHandle(entryName, options) {
      checkName(entryName);
      const create = !!(options && options.create);
      await withBrowserWorkspace('readonly', workspaceId, shownWorkspace, (store, record, out, fail) => {
        store.getAllKeys().onsuccess = browserStep(fail, (event) => {
          const keys = event.target.result;
          const directory = prefix + entryName + '/';
          if (keys.some((key) => key.startsWith(directory))) return;
          if (keys.includes(prefix + entryName)) throw browserEntryMismatch(entryName, 'folder');
          if (!create) throw browserEntryMissing(entryName); // with `create`, a folder with no file under it is a handle and nothing stored
        });
      });
      return browserDirectoryHandle(workspaceId, below(entryName), entryName, shownWorkspace);
    },
    async getFileHandle(entryName, options) {
      checkName(entryName);
      const create = !!(options && options.create);
      const fileKey = prefix + entryName;
      await withBrowserWorkspace(
        create ? 'readwrite' : 'readonly',
        workspaceId,
        shownWorkspace,
        (store, record, out, fail) => {
          store.get(fileKey).onsuccess = browserStep(fail, (event) => {
            if (event.target.result) return; // it exists: its bytes and its time are not touched
            store.getAllKeys().onsuccess = browserStep(fail, (ev) => {
              if (ev.target.result.some((key) => key.startsWith(fileKey + '/')))
                throw browserEntryMismatch(entryName, 'file');
              if (!create) throw browserEntryMissing(entryName);
              store.put(
                {
                  kind: 'file',
                  workspace: workspaceId,
                  path: below(entryName),
                  bytes: new Uint8Array(0),
                  modified: Date.now()
                },
                fileKey
              );
            });
          });
        }
      );
      return browserFileHandle(workspaceId, below(entryName), entryName, shownWorkspace);
    },
    async removeEntry(entryName) {
      checkName(entryName);
      const fileKey = prefix + entryName;
      await withBrowserWorkspace('readwrite', workspaceId, shownWorkspace, (store, record, out, fail) => {
        store.get(fileKey).onsuccess = browserStep(fail, (event) => {
          if (event.target.result) {
            store.delete(fileKey);
            return;
          }
          store.getAllKeys().onsuccess = browserStep(fail, (ev) => {
            if (ev.target.result.some((key) => key.startsWith(fileKey + '/'))) {
              throw browserEntryMismatch(entryName, 'file'); // the editor never removes a folder
            }
            throw browserEntryMissing(entryName);
          });
        });
      });
    },
    queryPermission: () => Promise.resolve('granted'),
    requestPermission: () => Promise.resolve('granted')
  };
}

/** The file `path` of a workspace. */
function browserFileHandle(workspaceId, path, name, ownerName) {
  const fileKey = BROWSER_FILE_PREFIX + workspaceId + '/' + path;
  return {
    kind: 'file',
    name,
    async getFile() {
      const record = await withBrowserWorkspace('readonly', workspaceId, ownerName, (store, workspace, out, fail) => {
        store.get(fileKey).onsuccess = browserStep(fail, (event) => {
          if (!isBrowserFileRecord(event.target.result)) throw browserEntryMissing(name);
          out.value = event.target.result;
        });
      });
      if (!ArrayBuffer.isView(record.bytes)) {
        throw browserError('NotReadableError', 'The file “' + name + '” could not be read from this browser.');
      }
      return new File([browserBytesOf(record.bytes)], name, {
        lastModified: typeof record.modified === 'number' ? record.modified : 0
      });
    },
    async createWritable() {
      const parts = [];
      let pending = Promise.resolve();
      let closed = false;
      return {
        write(chunk) {
          if (closed) return Promise.reject(new TypeError('This file has been closed.'));
          const next = pending.then(async () => {
            parts.push(await browserChunkBytes(chunk));
          });
          pending = next.catch(() => {});
          return next;
        },
        async close() {
          if (closed) throw new TypeError('This file has been closed.');
          await pending;
          closed = true;
          const whole = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
          let at = 0;
          for (const part of parts) {
            whole.set(part, at);
            at += part.length;
          }
          try {
            // DEC-3, DEC-6: one transaction reads the workspace and the previous record, and writes the whole file or nothing
            await withBrowserWorkspace('readwrite', workspaceId, ownerName, (store, workspace, out, fail) => {
              store.get(fileKey).onsuccess = browserStep(fail, (event) => {
                const previous = event.target.result;
                const before = previous && typeof previous.modified === 'number' ? previous.modified : 0;
                store.put(
                  {
                    kind: 'file',
                    workspace: workspaceId,
                    path,
                    bytes: whole,
                    modified: Math.max(Date.now(), before + 1) // a rewrite always changes it, as the stale check needs
                  },
                  fileKey
                );
              });
            });
          } catch (e) {
            throw browserStoreFailure(path, e);
          }
        },
        async abort() {
          closed = true;
          parts.length = 0;
        }
      };
    }
  };
}
