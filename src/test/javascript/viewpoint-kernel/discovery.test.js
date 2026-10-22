'use strict';
// Where the manifests are (run 0076, issue #73): an entry of `settings.manifests.paths` that ends in `/**` is read recursively, sorted, without the folders
// of the generated views; an entry without it reads what it always read. The cases are in discovery-cases.json, which the command line runs too
// (ManifestDiscoveryTest.java): the two tools find the same files in the same order and refuse the same paths with the same sentence.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'discovery-cases.json'), 'utf8'));
const KIND = 'archicode.morin.io/system';

/** The manifest the cases name by its id: YAML, or JSON or TOML when the file says so. */
function manifestOf(file, id) {
  if (file.endsWith('.toml')) return '[header]\nkind = "' + KIND + '"\nversion = "1"\n[content]\nid = "' + id + '"\nname = "' + id + '"\n';
  if (file.endsWith('.json')) return JSON.stringify({ header: { kind: KIND, version: '1' }, content: { id, name: id } }) + '\n';
  return 'header:\n  kind: "' + KIND + '"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
}

/** The end of a sentence given once in the file of cases. */
function sentence(template) {
  return template.replaceAll('${pattern}', DOCUMENT.tails.pattern).replaceAll('${below}', DOCUMENT.tails.below);
}

/** The folder of a case in memory, opened by the editor. */
async function open(c, options) {
  const files = {};
  const settings = 'settings:\n  manifests:\n    paths: ' + JSON.stringify(c.paths) + '\n' + (c.views ? '  views:\n    path: ' + JSON.stringify(c.views) + '\n' : '');
  files['.archicode.yaml'] = settings;
  for (const [file, value] of Object.entries(c.files)) files[file] = typeof value === 'string' ? manifestOf(file, value) : value.raw;
  const mem = memFolder(files, { links: c.links, markLinks: !(options && options.markLinks === false) });
  for (const dir of c.empty_dirs || []) mem.mkdir(dir);
  for (const link of Object.keys(c.links || {})) mem.mkdir(link.slice(0, link.lastIndexOf('/')));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state, mem };
}

const isYaml = (file) => /\.ya?ml$/.test(file);

function check(c, state) {
  const expect = c.expect;
  if (expect.error !== undefined) {
    const told = state.fatalError ? state.fatalError.replace(/^Could not read the plateaus of .archicode.yaml:\n/, '') : state.duplicateReferences.map((d) => d.message).join('\n');
    assert.equal(told, sentence(expect.error), c.what);
    return;
  }
  assert.equal(state.fatalError, null, 'the folder opens: ' + state.fatalError);
  if (expect.refused_file !== undefined) {
    const file = state.manifestFiles.find((f) => f.relPath === expect.refused_file);
    assert.ok(file && file.error, 'the editor refuses ' + expect.refused_file);
    return;
  }
  assert.deepEqual(Array.from(state.manifestFiles.map((f) => f.relPath)), expect.read.filter(isYaml), c.what);
  assert.deepEqual(Array.from(state.unreadManifestFiles), expect.read.filter((f) => !isYaml(f)), 'the files the editor does not read are told');
  for (const f of state.manifestFiles) assert.equal(f.error, null, f.relPath + ' is read');
  assert.deepEqual(Array.from(state.index.application.keys()).sort(), expect.read.filter(isYaml).map((f) => c.files[f]).sort(), 'the elements are those of the files');
}

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.what, async () => {
    const { state } = await open(c);
    check(c, state);
  });
}

test('D15 as a browser lists it, with a link that nothing tells from a folder: a folder inside itself is read once', async () => {
  // only the loop: a browser that follows a link to a folder that is not one it is inside of reads what is there, the command line and the served folder do not
  const c = Object.assign({}, DOCUMENT.cases.find((x) => x.id === 'D15'), { links: { 'manifests/loop': 'manifests' } });
  const { state } = await open(c, { markLinks: false });
  check(c, state);
});

test('a path that ends in `/**` is told from the rest by its end, and its folder is the path without it', () => {
  const { sandbox } = { sandbox: createApp({}) };
  assert.equal(sandbox.isRecursiveManifestsPath('manifests/**'), true);
  assert.equal(sandbox.isRecursiveManifestsPath('./**'), true);
  assert.equal(sandbox.isRecursiveManifestsPath('manifests'), false);
  assert.equal(sandbox.isRecursiveManifestsPath('manifests/*'), false);
  assert.equal(sandbox.manifestsFolderOf('manifests/**'), 'manifests');
  assert.equal(sandbox.manifestsFolderOf('manifests'), 'manifests');
  assert.equal(sandbox.manifestsPatternProblem('manifests/**'), null);
  assert.equal(sandbox.manifestsPatternProblem('a*b/*'), null, 'one star is a name, as it was');
  assert.equal(sandbox.manifestsPatternProblem('**'), DOCUMENT.tails.pattern);
});

test('the order is by code point, not by UTF-16 unit and not by locale', () => {
  const { compareCodePoints } = createApp({});
  assert.equal(compareCodePoints('～', '\u{1F600}'), -1, 'U+FF5E comes before U+1F600');
  assert.ok('～' > '\u{1F600}', 'the UTF-16 order is the other way round');
  assert.equal(compareCodePoints('B', 'a'), -1, 'an upper case letter before a lower case one, as the command line sorts');
  assert.equal(compareCodePoints('a', 'a/b'), -1);
  assert.equal(compareCodePoints('a-b', 'a.b'), -1);
  assert.equal(compareCodePoints('a.b', 'a/b'), -1);
  assert.equal(compareCodePoints('a/b', 'a/b'), 0);
  assert.equal(['b', 'B', 'a', 'A'].sort(compareCodePoints).join(''), 'ABab');
});

test('the Settings screen accepts a path that ends in `/**` and refuses the rest in the words of the command line', () => {
  const app = createApp({});
  assert.deepEqual(JSON.parse(JSON.stringify(app.validateManifestsPaths('manifests/**\n./**\nviews-source'))), { valid: true, paths: ['manifests/**', './**', 'views-source'] });
  for (const bad of ['manifests/**/sub', '**', 'manifests/**x', 'manifests/**/']) {
    const result = app.validateManifestsPaths('manifests\n' + bad);
    assert.equal(result.valid, false, bad);
    assert.equal(result.error, 'the path `' + bad + '` of `settings.manifests.paths` ' + DOCUMENT.tails.pattern, bad);
  }
  assert.match(app.validateManifestsPaths('../x/**').error, /^the path `..\/x\/\*\*` of `settings.manifests.paths` contains `..`: /);
  assert.match(app.validateManifestsPaths('/srv/**').error, /^the path `\/srv\/\*\*` of `settings.manifests.paths` is absolute: /);
});

test('a new file is written to the folder of the first path, which is the folder without its `/**`', async () => {
  const c = { paths: ['manifests/**', 'other'], files: { 'manifests/a.yaml': 'a' } };
  const { sandbox } = await open(c);
  assert.equal(sandbox.firstManifestsDir(), 'manifests');
  const dot = await open({ paths: ['./**'], files: { 'a.yaml': 'a' } });
  assert.equal(dot.sandbox.firstManifestsDir(), '');
});

test('the path of the Settings screen survives a save, `/**` included', async () => {
  const { sandbox, state, mem } = await open({ paths: ['manifests/**'], files: { 'manifests/sub/a.yaml': 'a' } });
  state.workspace.settings.manifests.paths = ['manifests/**', 'more/**'];
  state.workspace.settingsDirty = true;
  await sandbox.writeWorkspaceYaml();
  const written = mem.files.get('.archicode.yaml').text;
  assert.match(written, /manifests\/\*\*/);
  assert.match(written, /more\/\*\*/);
});

test('a served folder says which folders are links, and the editor does not follow them', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'served-links-'));
  fs.mkdirSync(path.join(root, 'manifests/sub'), { recursive: true });
  fs.mkdirSync(path.join(root, 'shared'));
  fs.writeFileSync(path.join(root, '.archicode.yaml'), 'settings:\n  manifests:\n    paths: ["manifests/**"]\n');
  fs.writeFileSync(path.join(root, 'manifests/a.yaml'), manifestOf('a.yaml', 'a'));
  fs.writeFileSync(path.join(root, 'manifests/sub/b.yaml'), manifestOf('b.yaml', 'b'));
  fs.writeFileSync(path.join(root, 'shared/s.yaml'), manifestOf('s.yaml', 's'));
  try {
    fs.symlinkSync(path.join(root, 'manifests'), path.join(root, 'manifests/loop'));
    fs.symlinkSync(path.join(root, 'shared'), path.join(root, 'manifests/shared'));
  } catch (e) {
    return; // no symbolic links on this system
  }
  const TOKEN = 't';
  const answer = (status, body) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, async text() { return body; }, async arrayBuffer() { const bytes = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)); return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }, async json() { return body; } });
  const fetch = async (url) => {
    const [route, query] = url.replace('/api/fs/', '').split('?');
    const rel = new URLSearchParams(query || '').get('path') || '';
    const target = path.join(root, rel);
    if (route === 'info') return answer(200, { folder: 'ws' });
    if (route === 'list') {
      return answer(200, fs.readdirSync(target).sort().filter((n) => !n.startsWith('.') || (rel === '' && n === '.archicode.yaml')) // as EditorHttpServer lists: nothing hidden but the workspace file at the root
      .map((name) => {
        const entry = path.join(target, name);
        const out = { name, kind: fs.statSync(entry).isDirectory() ? 'directory' : 'file' };
        if (fs.lstatSync(entry).isSymbolicLink()) out.link = true; // as EditorHttpServer says it
        return out;
      }));
    }
    return fs.existsSync(target) ? answer(200, fs.readFileSync(target, 'utf8')) : answer(404, 'not found');
  };
  const sandbox = createApp({ serverToken: TOKEN, fetch });
  await sandbox.openServedFolder();
  const state = sandbox.__state();
  assert.equal(state.fatalError, null);
  assert.deepEqual(Array.from(state.manifestFiles.map((f) => f.relPath)), ['manifests/a.yaml', 'manifests/sub/b.yaml']);
  assert.deepEqual(Array.from(state.index.application.keys()).sort(), ['a', 'b']);
});

test('the folders of a real disk are read the same way: the harness handle is a folder the editor can walk', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'disk-'));
  fs.mkdirSync(path.join(root, 'manifests/sub'), { recursive: true });
  fs.mkdirSync(path.join(root, 'views-to-be'));
  fs.writeFileSync(path.join(root, '.archicode.yaml'), 'settings:\n  manifests:\n    paths: ["manifests/**", "./**"]\n');
  fs.writeFileSync(path.join(root, 'manifests/sub/b.yaml'), manifestOf('b.yaml', 'b'));
  fs.writeFileSync(path.join(root, 'manifests/a.yaml'), manifestOf('a.yaml', 'a'));
  fs.writeFileSync(path.join(root, 'views-to-be/gap.json'), '{"gap": true}\n');
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(root);
  state.folder = { handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  assert.deepEqual(Array.from(state.manifestFiles.map((f) => f.relPath)), ['manifests/a.yaml', 'manifests/sub/b.yaml'], 'two paths find the same files, which are read once');
  assert.deepEqual(Array.from(state.unreadManifestFiles), []);
});

test('the example of the manual is read from its folders, in order, by the editor as by the command line', async () => {
  const root = path.resolve(__dirname, '../../../doc/examples/domain_manifest_folders');
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(root);
  state.folder = { handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  assert.deepEqual(Array.from(state.manifestFiles.map((f) => f.relPath)), [
    'manifests/application/shop.yaml',
    'manifests/application/shop/warehouse.yaml',
    'manifests/people/customer.yaml',
    'manifests/technology/reference.yaml',
    'manifests/technology/reference/server.yaml'
  ]);
  assert.deepEqual(Array.from(state.index.application.keys()).sort(), ['customer', 'shop', 'shop.warehouse', 'shop.web']);
  assert.deepEqual(Array.from(state.index.technology.keys()).sort(), ['reference', 'reference.server']);
  assert.deepEqual(Array.from(state.duplicateReferences), []);
});

test('a file created in the editor takes the place it has after a reload: the order of the files is by code point everywhere', async () => {
  const c = { paths: ['manifests'], files: { 'manifests/B.yaml': 'b', 'manifests/a.yaml': 'a' } };
  const { sandbox, state } = await open(c);
  assert.deepEqual(Array.from(state.manifestFiles.map((f) => f.relPath)), ['manifests/B.yaml', 'manifests/a.yaml']);
  sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', attachUnderReference: null, id: 'x', name: null, description: null });
  assert.deepEqual(Array.from(state.manifestFiles.map((f) => f.relPath)), ['manifests/B.yaml', 'manifests/a.yaml', 'manifests/app.x.yaml'], 'a locale would put B after a and app.x');
  const source = fs.readFileSync(path.join(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  assert.doesNotMatch(source, /relPath\.localeCompare/, 'no list of manifest files is sorted by locale (the plateau compared with, a new element, a new view or story)');
});

test('a views path that YAML reads as a number is the text it is, as the command line reads it', () => {
  const { isGeneratedViewsFolder } = createApp({});
  assert.equal(isGeneratedViewsFolder(['2024'], 2024), true);
  assert.equal(isGeneratedViewsFolder(['2024-to-be'], 2024), true);
  assert.equal(isGeneratedViewsFolder(['2025'], 2024), false);
});

test('a folder of a comparison is told by the two files a comparison writes, and by nothing else', () => {
  const { holdsComparisonFiles } = createApp({});
  const listing = (...entries) => entries.map(([name, kind]) => [name, { kind }]);
  assert.equal(holdsComparisonFiles(listing(['gap.json', 'file'], ['gap.md', 'file'], ['a.puml', 'file'])), true);
  assert.equal(holdsComparisonFiles(listing(['gap.json', 'file'])), false, 'a lone gap.json may be a manifest');
  assert.equal(holdsComparisonFiles(listing(['gap.md', 'file'])), false);
  assert.equal(holdsComparisonFiles(listing(['gap.json', 'file'], ['gap.md', 'directory'])), false, 'a folder called gap.md is no file');
});
