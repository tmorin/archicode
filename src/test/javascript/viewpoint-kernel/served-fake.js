'use strict';
// The server of `archicode editor serve` as the page sees it (wave 025, run 0193, task-006): a temporary copy of the fixture behind the /api/fs/ routes of
// EditorHttpServer, and the route of the sample (`samples/brightcart.yaml`, DEC-2). Every request is logged, so a test can say what the page asked for and
// with which method; `treeHash()` is a hash of the whole copy, so a test can say that nothing in it changed. Not a test file (the unit suite's glob is *.test.js).
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FIXTURE } = require('./harness');

const TOKEN = 'a-token';

/** `options.sample`: the text served at `samples/brightcart.yaml` (none: 404). */
function fakeServer(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'served-sample-'));
  fs.cpSync(FIXTURE, root, { recursive: true });
  const requests = [];
  const answer = (status, body, extra) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { get: (name) => (extra && extra[name]) || null },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
    async arrayBuffer() {
      const bytes = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
    async json() {
      return body;
    }
  });
  const fetch = async (url, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    requests.push({ url: String(url), method });
    const headers = {};
    for (const [key, value] of Object.entries(init.headers || {})) headers[key.toLowerCase()] = value;
    if (headers['x-archicode-token'] !== TOKEN) return answer(403, 'missing or wrong token');
    if (/(^|\/)samples\/brightcart\.yaml$/.test(String(url))) {
      return options.sample === undefined ? answer(404, 'not found') : answer(200, options.sample);
    }
    const [route, query] = String(url).replace('/api/fs/', '').split('?');
    const params = new URLSearchParams(query || '');
    const target = path.join(root, params.get('path') || '');
    if (route === 'info') return answer(200, { folder: 'architecture' });
    if (route === 'list') {
      if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) return answer(404, 'not a directory');
      return answer(
        200,
        fs
          .readdirSync(target)
          .sort()
          .map((name) => ({ name, kind: fs.statSync(path.join(target, name)).isDirectory() ? 'directory' : 'file' }))
      );
    }
    if (method === 'GET') {
      return fs.existsSync(target)
        ? answer(200, fs.readFileSync(target, 'utf8'), {
            'X-ArchiCode-Modified': String(Math.round(fs.statSync(target).mtimeMs))
          })
        : answer(404, 'not found');
    }
    if (method === 'PUT') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, await init.body.text());
      return answer(200, 'ok');
    }
    if (method === 'DELETE') {
      if (!fs.existsSync(target)) return answer(404, 'not found');
      fs.unlinkSync(target);
      return answer(200, 'ok');
    }
    return answer(405, 'method not allowed');
  };
  const treeHash = () => {
    const hash = crypto.createHash('sha256');
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir).sort()) {
        const entry = path.join(dir, name);
        if (fs.statSync(entry).isDirectory()) walk(entry);
        else hash.update(path.relative(root, entry) + '\n').update(fs.readFileSync(entry));
      }
    };
    walk(root);
    return hash.digest('hex');
  };
  return { root, fetch, requests, treeHash };
}

module.exports = { TOKEN, fakeServer };
