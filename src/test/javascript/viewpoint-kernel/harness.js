'use strict';
// Runs standalone.html's own <script> in a Node vm sandbox, on top of a read-only, file-system-backed shim of the
// File System Access API, and gives the embedded viewpoint kernel. Nothing here needs a browser or a build.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO = path.resolve(__dirname, '../../../..');
const HTML = path.join(REPO, 'src/main/resources/editor-webapp/standalone.html');
const FIXTURE = path.join(REPO, 'src/test/resources/viewpoint-kernel/workspace');

function notFound(p) {
  const e = new Error('NotFoundError: ' + p);
  e.name = 'NotFoundError';
  return e;
}

function makeFileHandle(absPath) {
  return {
    kind: 'file',
    async getFile() {
      const stat = fs.statSync(absPath);
      const text = fs.readFileSync(absPath, 'utf8');
      return { lastModified: stat.mtimeMs, async text() { return text; } };
    }
  };
}

function makeDirHandle(absPath) {
  return {
    kind: 'directory',
    name: path.basename(absPath),
    __path: absPath,
    async isSameEntry(other) { return !!other && other.__path === absPath; },
    async queryPermission() { return 'granted'; },
    async requestPermission() { return 'granted'; },
    async getFileHandle(name) {
      const p = path.join(absPath, name);
      if (!fs.existsSync(p)) throw notFound(p);
      return makeFileHandle(p);
    },
    async getDirectoryHandle(name) {
      const p = path.join(absPath, name);
      if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) throw notFound(p);
      return makeDirHandle(p);
    },
    async *entries() {
      for (const name of fs.readdirSync(absPath)) {
        const p = path.join(absPath, name);
        yield [name, fs.statSync(p).isDirectory() ? makeDirHandle(p) : makeFileHandle(p)];
      }
    }
  };
}

function domError(name, message) {
  const e = new Error(message || name);
  e.name = name;
  return e;
}

/**
 * An in-memory IndexedDB with the semantics the editor relies on: `open` with a version (`upgradeneeded` when the
 * database is new or older, `VersionError` when it is newer), transactions that commit when no request is left and keep
 * nothing when they abort (a request error not prevented aborts them, so does a throw in a handler), requests refused
 * once their transaction has committed (as a browser's auto-commit across an `await` does), a `DataCloneError` thrown
 * synchronously by `put` for a value that cannot be cloned, and get / put / delete / getAll / getAllKeys. Every event
 * fires later, as in a browser. Options: `failOpen` (an error name), `failGetAll`, `failPut(key, value)` (an
 * asynchronous `QuotaExceededError`). A handle carrying `unclonable: true` cannot be cloned. `seed` and `dump` set and
 * read a database from a test; `calls` lists what the page asked.
 */
function fakeIndexedDB(options = {}) {
  const databases = new Map(); // name -> { version, stores: Map<storeName, Map<key, value>> }
  const calls = [];
  const later = (fn) => setTimeout(fn, 0);
  // a browser stores a clone: the record is a new object, the handle in it an equivalent handle (here, the same one)
  const copy = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.assign({}, v) : v);
  const unclonable = (v) => !!v && typeof v === 'object' && (v.unclonable === true || Object.values(v).some((x) => x && x.unclonable === true));
  const sortedKeys = (map) => Array.from(map.keys()).sort();

  function connection(db) {
    let closed = false;
    const conn = {
      get version() { return db.version; },
      objectStoreNames: { contains: (s) => db.stores.has(s) },
      createObjectStore(s) { db.stores.set(s, new Map()); return {}; },
      onversionchange: null,
      close() { closed = true; },
      get closed() { return closed; },
      transaction(storeName, mode = 'readonly') {
        if (closed) throw domError('InvalidStateError', 'the connection is closed');
        if (!db.stores.has(storeName)) throw domError('NotFoundError', 'no object store ' + storeName);
        calls.push({ op: 'transaction', store: storeName, mode });
        return transaction(db.stores.get(storeName), storeName, mode);
      }
    };
    return conn;
  }

  function transaction(live, storeName, mode) {
    const staged = new Map(live); // what this transaction reads: the store as it was, plus its own writes
    const writes = []; // replayed on the store at the commit, so two transactions never overwrite each other's keys
    const queue = [];
    let done = false;
    let scheduled = false;
    const tx = { mode, error: null, oncomplete: null, onerror: null, onabort: null, objectStore, abort() { if (done) throw domError('InvalidStateError'); end(null); } };
    function end(error) {
      done = true;
      tx.error = error;
      for (const { req } of queue.splice(0)) req.error = domError('AbortError');
      later(() => {
        if (error && tx.onerror) tx.onerror({ target: tx });
        if (tx.onabort) tx.onabort({ target: tx });
      });
    }
    function pump() {
      if (scheduled || done) return;
      scheduled = true;
      later(() => {
        scheduled = false;
        if (done) return;
        if (queue.length === 0) { // nothing left to do: the transaction commits
          done = true;
          for (const w of writes) w(live);
          if (tx.oncomplete) tx.oncomplete({ target: tx });
          return;
        }
        const { req, op } = queue.shift();
        let result;
        try { result = op(); } catch (e) {
          req.error = e;
          let prevented = false;
          try { if (req.onerror) req.onerror({ target: req, preventDefault() { prevented = true; } }); } catch (thrown) { prevented = false; }
          if (!prevented) { end(e); return; }
          pump();
          return;
        }
        req.result = result;
        try { if (req.onsuccess) req.onsuccess({ target: req }); } catch (e) { end(e); return; }
        pump();
      });
    }
    function request(op) {
      if (done) throw domError('TransactionInactiveError', 'the transaction has finished');
      const req = { result: undefined, error: null, onsuccess: null, onerror: null };
      queue.push({ req, op });
      pump();
      return req;
    }
    function writable() { if (mode !== 'readwrite') throw domError('ReadOnlyError'); }
    function objectStore(s) {
      if (s !== storeName) throw domError('NotFoundError', 'not in this transaction: ' + s);
      return {
        get: (key) => request(() => copy(staged.get(key))),
        getAll: () => request(() => {
          if (options.failGetAll) throw domError('DataError', 'a stored value could not be read');
          return sortedKeys(staged).map((k) => copy(staged.get(k)));
        }),
        getAllKeys: () => request(() => sortedKeys(staged)),
        put(value, key) {
          writable();
          if (done) throw domError('TransactionInactiveError', 'the transaction has finished');
          if (unclonable(value)) throw domError('DataCloneError', 'the value cannot be cloned');
          const stored = copy(value);
          calls.push({ op: 'put', key });
          return request(() => {
            if (options.failPut && options.failPut(key, value)) throw domError('QuotaExceededError', 'no room left');
            staged.set(key, stored);
            writes.push((m) => m.set(key, stored));
            return key;
          });
        },
        delete(key) {
          writable();
          calls.push({ op: 'delete', key });
          return request(() => {
            staged.delete(key);
            writes.push((m) => m.delete(key));
          });
        }
      };
    }
    pump(); // a transaction that is given no request commits too
    return tx;
  }

  return {
    calls,
    open(name, version) {
      calls.push({ op: 'open', name, version });
      const req = { result: null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
      const fail = (error) => { req.error = error; if (req.onerror) req.onerror({ target: req }); };
      later(() => {
        if (options.failOpen) { fail(domError(options.failOpen)); return; }
        let db = databases.get(name);
        const wanted = version === undefined ? (db ? db.version : 1) : version;
        if (db && wanted < db.version) { fail(domError('VersionError', 'the database is newer')); return; }
        if (!db || wanted > db.version) {
          const oldVersion = db ? db.version : 0;
          const before = db ? new Map(Array.from(db.stores, ([k, v]) => [k, new Map(v)])) : null;
          if (!db) { db = { version: wanted, stores: new Map() }; databases.set(name, db); }
          db.version = wanted;
          req.result = connection(db);
          try {
            if (req.onupgradeneeded) req.onupgradeneeded({ target: req, oldVersion, newVersion: wanted });
          } catch (e) { // the upgrade aborts: the database is left as it was
            if (before) { db.version = oldVersion; db.stores = before; } else databases.delete(name);
            fail(domError('AbortError', 'the upgrade failed'));
            return;
          }
        } else {
          req.result = connection(db);
        }
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    /** Puts a database in place, as an earlier page would have left it: `{ storeName: { key: value } }`. */
    seed(name, version, stores) {
      databases.set(name, { version, stores: new Map(Object.entries(stores).map(([s, records]) => [s, new Map(Object.entries(records))])) });
    },
    /** The database as stored: `{ version, stores: { storeName: { key: value } } }`, or null. */
    dump(name) {
      const db = databases.get(name);
      if (!db) return null;
      const stores = {};
      for (const [s, records] of db.stores) stores[s] = Object.fromEntries(Array.from(records, ([k, v]) => [k, copy(v)]));
      return { version: db.version, stores };
    }
  };
}

function createApp(options = {}) {
  const html = fs.readFileSync(HTML, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  const wasm = html.match(/<script type="application\/octet-stream" id="viewpoint-kernel-wasm">([^<]+)<\/script>/);
  if (!script || !wasm) throw new Error('standalone.html: script or embedded kernel not found');

  const appEl = { id: 'app', innerHTML: '', addEventListener() {} };
  let hash = '';
  let search = options.search || '';
  const pathname = options.pathname || '/';
  const windowListeners = {};
  const documentListeners = {};
  const rootAttributes = {}; // the attributes of the root element (data-theme), as the page sets them
  const sandbox = {
    console: { log() {}, info() {}, debug() {}, warn: console.warn, error: console.error }, // the editor logs its state
    window: { addEventListener(type, fn) { (windowListeners[type] = windowListeners[type] || []).push(fn); } },
    location: {
      get hash() { return hash; },
      set hash(v) { hash = v.startsWith('#') ? v : '#' + v; },
      get search() { return search; },
      get pathname() { return pathname; }
    },
    history: {
      // like a browser: the url replaces the query and the hash of the address bar
      replaceState(state, title, url) {
        const i = url.indexOf('#');
        hash = i === -1 ? '' : url.slice(i);
        const before = i === -1 ? url : url.slice(0, i);
        const q = before.indexOf('?');
        search = q === -1 ? '' : before.slice(q);
      },
      pushState() {}
    },
    document: {
      documentElement: {
        getAttribute: (name) => (name in rootAttributes ? rootAttributes[name] : null),
        setAttribute: (name, value) => { rootAttributes[name] = String(value); },
        removeAttribute: (name) => { delete rootAttributes[name]; }
      },
      getElementById(id) {
        if (id === 'app') return appEl;
        if (id === 'viewpoint-kernel-wasm') return { textContent: wasm[1] };
        return null;
      },
      querySelectorAll() { return []; },
      querySelector(selector) {
        // the page served by `editor serve` carries the token of the server in a <meta>
        return options.serverToken && selector === 'meta[name="archicode-server"]' ? { getAttribute: () => options.serverToken } : null;
      },
      addEventListener(type, fn) { (documentListeners[type] = documentListeners[type] || []).push(fn); }
    },
    localStorage: options.localStorage, // absent: the page runs as if the browser refused its storage
    fetch: options.fetch,
    File: options.serverToken ? class { constructor(parts, name, options = {}) { this.parts = parts; this.name = name; this.lastModified = options.lastModified; } async text() { return this.parts.join(''); } } : undefined,
    Blob,
    // the remembered folders: an in-memory IndexedDB of its own per page, unless the test gives one (to share it, or seed it)
    indexedDB: options.indexedDB === undefined ? fakeIndexedDB() : options.indexedDB,
    setTimeout,
    atob, TextEncoder, TextDecoder, URLSearchParams
  };
  sandbox.window.indexedDB = sandbox.indexedDB;
  sandbox.globalThis = sandbox;
  sandbox.__windowListeners = windowListeners; // what the page registered, to fire by hand
  sandbox.__documentListeners = documentListeners;
  vm.createContext(sandbox);
  vm.runInContext(script[1], sandbox, { filename: 'standalone.html-script.js' });
  vm.runInContext('globalThis.__state = () => AppState;', sandbox);
  return sandbox;
}

/** The fixture workspace, loaded the way the editor loads a folder. */
async function openFixture() {
  const sandbox = createApp();
  await sandbox.loadWorkspace(makeDirHandle(FIXTURE));
  const state = sandbox.__state();
  if (state.fatalError) throw new Error('the fixture does not load: ' + state.fatalError);
  const kernel = await sandbox.loadViewpointKernel();
  return { sandbox, state, kernel };
}

module.exports = { FIXTURE, createApp, fakeIndexedDB, makeDirHandle, openFixture };
