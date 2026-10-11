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
    fetch: options.fetch,
    File: options.serverToken ? class { constructor(parts, name, options = {}) { this.parts = parts; this.name = name; this.lastModified = options.lastModified; } async text() { return this.parts.join(''); } } : undefined,
    Blob,
    indexedDB: {},
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

module.exports = { FIXTURE, createApp, makeDirHandle, openFixture };
