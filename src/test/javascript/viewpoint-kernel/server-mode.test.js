'use strict';
// The editor served by `archicode editor serve`: it opens the folder of the server by itself, in any browser, through
// objects that answer the File System Access API calls the rest of the editor makes. The server is played by an
// in-memory copy of the fixture that speaks the same /api/fs/ routes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FIXTURE, createApp } = require('./harness');

const TOKEN = 'a-token';

/** The routes of EditorHttpServer, over a temporary copy of the fixture. */
function fakeServer() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'served-'));
  fs.cpSync(FIXTURE, root, { recursive: true });
  const calls = [];
  const answer = (status, body, extra) => ({
    ok: status >= 200 && status < 300,
    status,
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
  const fetch = async (url, init) => {
    const [route, query] = url.replace('/api/fs/', '').split('?');
    const params = new URLSearchParams(query || '');
    const target = path.join(root, params.get('path') || '');
    calls.push({ method: init.method, route, path: params.get('path') });
    if (init.headers['X-ArchiCode-Token'] !== TOKEN) return answer(401, 'missing or wrong token');
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
    if (init.method === 'GET') {
      return fs.existsSync(target)
        ? answer(200, fs.readFileSync(target, 'utf8'), {
            'X-ArchiCode-Modified': String(Math.round(fs.statSync(target).mtimeMs))
          })
        : answer(404, 'not found');
    }
    if (init.method === 'PUT') {
      const existed = fs.existsSync(target);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, await init.body.text());
      return answer(existed ? 200 : 201, 'ok');
    }
    if (init.method === 'DELETE') {
      if (!fs.existsSync(target)) return answer(404, 'not found');
      fs.unlinkSync(target);
      return answer(200, 'ok');
    }
    return answer(405, 'method not allowed');
  };
  return { root, fetch, calls };
}

test('a page served by the server opens the folder of the server, with no picker', async () => {
  const server = fakeServer();
  const sandbox = createApp({ serverToken: TOKEN, fetch: server.fetch });
  assert.equal(sandbox.isServedByArchiCode(), true);
  assert.equal(sandbox.isFolderAccessAvailable(), true, 'a browser without the File System Access API can open it');
  await sandbox.openServedFolder();
  const state = sandbox.__state ? sandbox.__state() : null;
  const app = state || sandbox.AppState;
  assert.equal(app.fatalError, null);
  assert.ok(app.workspace, 'the workspace is loaded');
  assert.equal(app.folder.name, 'architecture');
  assert.ok(app.index.application.has('shop.web'), 'with its manifests');
  assert.equal(sandbox.landingScreenConfig(), null);
  assert.ok(server.calls.some((c) => c.route === 'info'));
  assert.doesNotMatch(sandbox.renderTopPanelHtml(), /close-folder/, 'there is no other folder to pick');
});

test('outside the server, the editor asks for a folder as before', () => {
  const sandbox = createApp();
  assert.equal(sandbox.isServedByArchiCode(), false);
  assert.equal(sandbox.isFolderAccessAvailable(), false, 'no picker in this browser');
  assert.equal(sandbox.landingScreenConfig().kind, 'unsupported');
  assert.match(sandbox.landingScreenConfig().text, /archicode editor serve/, 'and says what works everywhere');
});

test('the handles of the server read, write, create and remove like the ones of the browser', async () => {
  const server = fakeServer();
  const sandbox = createApp({ serverToken: TOKEN, fetch: server.fetch });
  const root = sandbox.serverDirectoryHandle('', 'architecture');
  assert.equal(await root.queryPermission({ mode: 'readwrite' }), 'granted');

  const names = [];
  for await (const [name, handle] of root.entries()) names.push(name + ':' + handle.kind);
  assert.ok(names.includes('.archicode.yaml:file'));
  assert.ok(names.some((n) => n.endsWith(':directory')));

  const file = await (await root.getFileHandle('.archicode.yaml')).getFile();
  assert.equal(await file.text(), fs.readFileSync(path.join(server.root, '.archicode.yaml'), 'utf8'));
  assert.equal(
    file.lastModified,
    Math.round(fs.statSync(path.join(server.root, '.archicode.yaml')).mtimeMs),
    'the time the editor compares to see a file changed under it'
  );

  await assert.rejects(root.getFileHandle('missing.yaml'), (e) => e.name === 'NotFoundError');
  await assert.rejects(root.getDirectoryHandle('missing'), (e) => e.name === 'NotFoundError');

  const created = await (
    await root.getDirectoryHandle('extra', { create: true })
  ).getFileHandle('app.new.yaml', { create: true });
  const writable = await created.createWritable();
  await writable.write('header: {kind: person}\n');
  await writable.write({ type: 'write', data: 'content: {id: new}\n' });
  await writable.close();
  assert.equal(
    fs.readFileSync(path.join(server.root, 'extra/app.new.yaml'), 'utf8'),
    'header: {kind: person}\ncontent: {id: new}\n'
  );

  const dir = await root.getDirectoryHandle('extra');
  await dir.removeEntry('app.new.yaml');
  assert.equal(fs.existsSync(path.join(server.root, 'extra/app.new.yaml')), false);
  await assert.rejects(dir.removeEntry('app.new.yaml'), (e) => e.name === 'NotFoundError');
});

test('a wrong token, or a server that is gone, is said on the landing page', async () => {
  const server = fakeServer();
  const sandbox = createApp({ serverToken: 'another', fetch: server.fetch });
  await sandbox.openServedFolder();
  const config = sandbox.landingScreenConfig();
  assert.equal(config.kind, 'error');
  assert.match(config.text, /could not be reached/);
  assert.match(config.text, /archicode editor serve/);
});

test('the token the server asked for in the address is taken out of it at startup (the hash stays), and is not needed again', async () => {
  const server = fakeServer();
  const sandbox = createApp({
    serverToken: TOKEN,
    fetch: server.fetch,
    search: '?token=' + TOKEN + '&x=1',
    pathname: '/editor.html'
  });
  sandbox.location.hash = '#/timeline/applications?pin=shop.web';
  assert.match(sandbox.location.search, /token=/);
  const started = sandbox.__documentListeners.DOMContentLoaded;
  assert.equal(started.length, 1);
  started[0]();
  assert.equal(sandbox.location.search, '?x=1', 'only the token goes');
  assert.equal(sandbox.location.hash, '#/timeline/applications?pin=shop.web', 'the place in the editor stays');
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(sandbox.__state().workspace, 'the page opened the folder with the token of its <meta>, not of the address');

  const alone = createApp({ serverToken: TOKEN, fetch: server.fetch, search: '?token=' + TOKEN });
  alone.stripServerTokenFromUrl();
  assert.equal(alone.location.search, '', 'no empty "?" left');
  const none = createApp({ serverToken: TOKEN, fetch: server.fetch, search: '?other=1' });
  none.stripServerTokenFromUrl();
  assert.equal(none.location.search, '?other=1', 'another parameter is left alone');
});
