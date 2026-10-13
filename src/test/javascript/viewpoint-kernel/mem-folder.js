'use strict';
// An in-memory, writable folder behind the File System Access API shim the editor uses, and the files of the fixture workspace as a path -> text
// object. Nothing touches the disk. Used by the tests that save (model-ops.test.js, library-view-edit.test.js).
const fs = require('node:fs');
const path = require('node:path');
const { FIXTURE } = require('./harness');

function notFound(p) {
  const e = new Error('NotFoundError: ' + p);
  e.name = 'NotFoundError';
  return e;
}

function memFolder(initial) {
  const files = new Map(); // path -> { text, mtime }
  const dirs = new Set(['']);
  let clock = 1000;
  const mem = { files, dirs, writes: [], removals: [], onWrite: null, failGetFile: null };
  const addDirs = (p) => {
    const parts = p.split('/').slice(0, -1);
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  };
  mem.put = (p, text) => { addDirs(p); files.set(p, { text, mtime: ++clock }); };
  for (const [p, text] of Object.entries(initial)) mem.put(p, text);

  const fileHandle = (p) => ({
    kind: 'file',
    name: p.split('/').pop(),
    async getFile() {
      if (mem.failGetFile) throw new Error(mem.failGetFile);
      const f = files.get(p);
      if (!f) throw notFound(p);
      return { lastModified: f.mtime, async text() { return f.text; } };
    },
    async createWritable() {
      let buffer = '';
      return {
        async write(data) { buffer += data; },
        async close() {
          if (mem.onWrite) await mem.onWrite(p);
          mem.writes.push(p);
          files.set(p, { text: buffer, mtime: ++clock });
        }
      };
    }
  });
  const dirHandle = (dirPath) => {
    const child = (name) => (dirPath ? dirPath + '/' + name : name);
    return {
      kind: 'directory',
      name: dirPath.split('/').pop() || 'ws',
      async queryPermission() { return 'granted'; },
      async requestPermission() { return 'granted'; },
      async *entries() {
        for (const p of Array.from(files.keys())) {
          if (p.slice(0, p.lastIndexOf('/') === -1 ? 0 : p.lastIndexOf('/')) === dirPath && (p.indexOf('/') === -1) === (dirPath === '')) yield [p.split('/').pop(), fileHandle(p)];
        }
        for (const d of Array.from(dirs)) {
          if (d !== '' && d.slice(0, d.lastIndexOf('/') === -1 ? 0 : d.lastIndexOf('/')) === dirPath) yield [d.split('/').pop(), dirHandle(d)];
        }
      },
      async getFileHandle(name, options) {
        const p = child(name);
        if (!files.has(p)) {
          if (!(options && options.create) || !dirs.has(dirPath)) throw notFound(p);
          files.set(p, { text: '', mtime: ++clock });
        }
        return fileHandle(p);
      },
      async getDirectoryHandle(name, options) {
        const p = child(name);
        if (!dirs.has(p)) {
          if (!(options && options.create)) throw notFound(p);
          dirs.add(p);
        }
        return dirHandle(p);
      },
      async removeEntry(name) {
        const p = child(name);
        if (!files.delete(p)) throw notFound(p);
        mem.removals.push(p);
      }
    };
  };
  mem.handle = dirHandle('');
  return mem;
}

/** The files of the fixture workspace (workspace.yaml and the manifests), as a path -> text object. */
function fixtureFiles() {
  const out = { 'workspace.yaml': fs.readFileSync(path.join(FIXTURE, 'workspace.yaml'), 'utf8') };
  for (const name of fs.readdirSync(path.join(FIXTURE, 'manifests'))) {
    out['manifests/' + name] = fs.readFileSync(path.join(FIXTURE, 'manifests', name), 'utf8');
  }
  return out;
}

module.exports = { memFolder, fixtureFiles };
