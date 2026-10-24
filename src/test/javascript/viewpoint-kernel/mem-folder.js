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

/**
 * `options.links`: a link -> the folder it points at (both from the root); the link is listed as a folder that holds what the target holds, and carries
 * `symbolicLink: true` as the entries of the served folder do (`options.markLinks: false`: as a browser lists it, with nothing to tell it from a folder).
 * `isSameEntry` compares the folders they stand for.
 */
function memFolder(initial, options) {
  const links = Object.entries((options && options.links) || {}).map(([link, target]) => [
    link,
    target === '.' ? '' : target
  ]);
  const markLinks = !(options && options.markLinks === false);
  const files = new Map(); // path -> { text, mtime }
  const dirs = new Set(['']);
  let clock = 1000;
  const mem = { files, dirs, writes: [], removals: [], onWrite: null, failGetFile: null };
  const addDirs = (p) => {
    const parts = p.split('/').slice(0, -1);
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  };
  mem.mkdir = (p) => {
    addDirs(p + '/x');
  };
  mem.put = (p, text) => {
    addDirs(p);
    files.set(p, { text, mtime: ++clock });
  };
  for (const [p, text] of Object.entries(initial)) mem.put(p, text);

  const fileHandle = (p) => ({
    kind: 'file',
    name: p.split('/').pop(),
    async getFile() {
      if (mem.failGetFile) throw new Error(mem.failGetFile);
      const f = files.get(p);
      if (!f) throw notFound(p);
      // a file that starts with a byte-order mark is a real File, as a browser gives it: `text()` drops the mark and the bytes still have it (#119)
      if (f.text.charCodeAt(0) === 0xfeff)
        return new File([Buffer.from(f.text, 'utf8')], p.split('/').pop(), { lastModified: f.mtime });
      return {
        lastModified: f.mtime,
        async text() {
          return f.text;
        }
      };
    },
    async createWritable() {
      let buffer = '';
      return {
        async write(data) {
          buffer += data;
        },
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
      __path: dirPath,
      async isSameEntry(other) {
        return !!other && other.__path === dirPath;
      },
      async queryPermission() {
        return 'granted';
      },
      async requestPermission() {
        return 'granted';
      },
      async *entries() {
        for (const p of Array.from(files.keys())) {
          if (
            p.slice(0, p.lastIndexOf('/') === -1 ? 0 : p.lastIndexOf('/')) === dirPath &&
            (p.indexOf('/') === -1) === (dirPath === '')
          )
            yield [p.split('/').pop(), fileHandle(p)];
        }
        for (const d of Array.from(dirs)) {
          if (d !== '' && d.slice(0, d.lastIndexOf('/') === -1 ? 0 : d.lastIndexOf('/')) === dirPath)
            yield [d.split('/').pop(), dirHandle(d)];
        }
        for (const [link, target] of links) {
          if (link.slice(0, link.lastIndexOf('/') === -1 ? 0 : link.lastIndexOf('/')) !== dirPath) continue;
          const handle = dirHandle(target);
          if (markLinks) handle.symbolicLink = true;
          yield [link.split('/').pop(), handle];
        }
      },
      async getFileHandle(name, flags) {
        const p = child(name);
        if (!files.has(p)) {
          if (!(flags && flags.create) || !dirs.has(dirPath)) throw notFound(p);
          files.set(p, { text: '', mtime: ++clock });
        }
        return fileHandle(p);
      },
      async getDirectoryHandle(name, flags) {
        const p = child(name);
        if (!dirs.has(p)) {
          if (!(flags && flags.create)) throw notFound(p);
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

/** The files of the fixture workspace (.archicode.yaml and the manifests), as a path -> text object. */
function fixtureFiles() {
  const out = { '.archicode.yaml': fs.readFileSync(path.join(FIXTURE, '.archicode.yaml'), 'utf8') };
  for (const name of fs.readdirSync(path.join(FIXTURE, 'manifests'))) {
    out['manifests/' + name] = fs.readFileSync(path.join(FIXTURE, 'manifests', name), 'utf8');
  }
  return out;
}

module.exports = { memFolder, fixtureFiles };
