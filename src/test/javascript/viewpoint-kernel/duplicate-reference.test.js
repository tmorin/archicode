'use strict';
// A reference declared twice (run 0034): the editor reports it instead of keeping the last file in alphabetical order, in
// the words of the command line (`DuplicateReferenceTest` runs the same cases against the loader of the CLI), puts the
// error on the files that declare it, and draws nothing from a model with no single answer. The same goes for two views,
// or two stories, with the same id. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder, fixtureFiles } = require('./mem-folder');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

const system = (id, name, elements) =>
  'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "' +
  name +
  '"\n' +
  (elements ? '  elements:\n' + elements.join('') : '');
const container = (id, name) => '    - kind: "container"\n      id: "' + id + '"\n      name: "' + name + '"\n';
const containerUnder = (parent, id, name) =>
  'header:\n  kind: "archicode.morin.io/container"\n  version: "1"\n  parent: "' +
  parent +
  '"\ncontent:\n  id: "' +
  id +
  '"\n  name: "' +
  name +
  '"\n';
const node = (id, name) =>
  'header:\n  kind: "archicode.morin.io/node"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n';
const view = (id) =>
  'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  viewpoint: overview\n  layer: application\n  properties:\n    element: shop\n';
const story = (id) =>
  'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "S"\n  steps: []\n';

/** A workspace of the given manifests (path -> text), the manifests folders being `manifests` and `shared`. */
async function open(files) {
  // a text file in each folder, so that the folder exists (it is not a manifest)
  const mem = memFolder(
    Object.assign(
      {
        'manifests/.keep.txt': '',
        'shared/.keep.txt': '',
        '.archicode.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n      - shared\n'
      },
      files
    )
  );
  const sandbox = createApp();
  await sandbox.loadWorkspace(mem.handle);
  const state = sandbox.__state();
  assert.equal(state.fatalError, null);
  return { sandbox, state, mem };
}

const messages = (state) => plain(state.duplicateReferences).map((d) => d.message);

test('two different copies of a reference are reported with both files', async () => {
  const { state } = await open({
    'manifests/a.yaml': system('shop', 'Shop'),
    'manifests/b.yaml': system('shop', 'The shop')
  });
  assert.deepEqual(messages(state), [
    'the reference `shop` is declared twice: in `manifests/a.yaml` and `manifests/b.yaml`'
  ]);
});

test('two identical copies are reported as well', async () => {
  const { state } = await open({
    'manifests/a.yaml': system('shop', 'Shop'),
    'manifests/b.yaml': system('shop', 'Shop')
  });
  assert.deepEqual(messages(state), [
    'the reference `shop` is declared twice: in `manifests/a.yaml` and `manifests/b.yaml`'
  ]);
});

test('the files are named from the folder of the workspace, whichever manifests folder they are in', async () => {
  const { state } = await open({ 'shared/z.yaml': system('shop', 'Shop'), 'manifests/a.yaml': system('shop', 'Shop') });
  assert.deepEqual(messages(state), [
    'the reference `shop` is declared twice: in `manifests/a.yaml` and `shared/z.yaml`'
  ]);
});

test('an element nested in a file and a manifest placed under its parent by header.parent are one reference', async () => {
  const { state } = await open({
    'manifests/shop.yaml': system('shop', 'Shop', [container('web', 'Web')]),
    'manifests/web.yaml': containerUnder('shop', 'web', 'Web again')
  });
  assert.deepEqual(messages(state), [
    'the reference `shop.web` is declared twice: in `manifests/shop.yaml` and `manifests/web.yaml`'
  ]);
});

test('an element nested twice in one file is told with that file', async () => {
  const { state } = await open({
    'manifests/shop.yaml': system('shop', 'Shop', [container('web', 'Web'), container('web', 'Web')])
  });
  assert.deepEqual(messages(state), ['the reference `shop.web` is declared twice in `manifests/shop.yaml`']);
});

test('several declarations and several references are all told, by reference, whatever the order of the files', async () => {
  const { state } = await open({
    'manifests/c.yaml': system('shop', 'C', [container('web', 'C')]),
    'manifests/a.yaml': system('shop', 'A', [container('web', 'A')]),
    'manifests/b.yaml': system('shop', 'B'),
    'manifests/d.yaml': system('mail', 'D'),
    'shared/d.yaml': system('mail', 'D')
  });
  assert.deepEqual(messages(state), [
    'the reference `mail` is declared twice: in `manifests/d.yaml` and `shared/d.yaml`',
    'the reference `shop` is declared 3 times: in `manifests/a.yaml`, `manifests/b.yaml` and `manifests/c.yaml`',
    'the reference `shop.web` is declared twice: in `manifests/a.yaml` and `manifests/c.yaml`'
  ]);
});

test('the same reference in the application and the technology layers is no duplicate', async () => {
  const { state } = await open({
    'manifests/a.yaml': system('shop', 'Shop'),
    'manifests/n.yaml': node('shop', 'Shop node')
  });
  assert.deepEqual(messages(state), []);
});

test('a workspace without duplicates reports nothing, and the fixture is one', async () => {
  const { state } = await open(fixtureFiles());
  assert.deepEqual(messages(state), []);
});

test('two views, or two stories, with the same id are reported; a view and a story with one id are not', async () => {
  const { state } = await open({
    'manifests/view.v1.yaml': view('v1'),
    'manifests/view.v1b.yaml': view('v1'),
    'manifests/story.s1.yaml': story('s1'),
    'shared/story.s1.yaml': story('s1'),
    'manifests/view.same.yaml': view('same'),
    'manifests/story.same.yaml': story('same')
  });
  assert.deepEqual(messages(state), [
    'the story `s1` is declared twice: in `manifests/story.s1.yaml` and `shared/story.s1.yaml`',
    'the view `v1` is declared twice: in `manifests/view.v1.yaml` and `manifests/view.v1b.yaml`'
  ]);
});

test('the words are those of the command line: the unit cases of the message', async () => {
  const { sandbox } = await open({});
  assert.equal(
    sandbox.duplicateReferenceMessage('x', ['a.yaml', 'a.yaml', 'a.yaml']),
    'the reference `x` is declared 3 times in `a.yaml`'
  );
  assert.equal(
    sandbox.duplicateReferenceMessage('x', ['b.yaml', 'a.yaml', 'a.yaml']),
    'the reference `x` is declared 3 times: in `a.yaml` (twice) and `b.yaml`'
  );
});

test('the duplicate is told in Elements and in Files, and each file that takes part carries the error', async () => {
  const { sandbox, state } = await open({
    'manifests/a.yaml': system('shop', 'Shop'),
    'manifests/b.yaml': system('shop', 'The shop'),
    'manifests/c.yaml': system('mail', 'Mail')
  });
  const banner = sandbox.renderDuplicateReferencesHtml();
  assert.match(banner, /role="alert"/);
  assert.match(
    banner,
    /One reference, view or story is<\/strong>|One reference, view or story is declared more than once/
  );
  assert.ok(
    banner.includes(
      '<code>shop</code> is declared twice: in <code>manifests/a.yaml</code> and <code>manifests/b.yaml</code>'
    )
  );
  const files = sandbox.renderFilesNavHtml();
  assert.ok(files.includes('nav-duplicate-note'), 'Files says it too');
  const row = (relPath) =>
    files.split('<div class="nav-row file-row').find((chunk) => chunk.includes('data-relpath="' + relPath + '"')) || '';
  assert.ok(/has-error/.test(row('manifests/a.yaml')) && row('manifests/a.yaml').includes('>duplicate<'));
  assert.ok(/has-error/.test(row('manifests/b.yaml')) && row('manifests/b.yaml').includes('>duplicate<'));
  assert.ok(!row('manifests/c.yaml').includes('duplicate') && !/has-error/.test(row('manifests/c.yaml')));
  assert.ok(sandbox.renderFileViewHtml('manifests/a.yaml').includes('<strong>Duplicate reference:</strong>'));
  assert.ok(!sandbox.renderFileViewHtml('manifests/c.yaml').includes('Duplicate reference'));
  assert.equal(
    state.manifestFiles.find((f) => f.relPath === 'manifests/a.yaml').error,
    null,
    'it is not a parse error of the file'
  );
});

test('the Elements navigation carries the banner, and a workspace without duplicate none', async () => {
  const dup = await open({ 'manifests/a.yaml': system('shop', 'Shop'), 'manifests/b.yaml': system('shop', 'Shop') });
  assert.ok(dup.sandbox.renderElementsPerspectiveHtml().left.includes('nav-duplicate-note'));
  const ok = await open({ 'manifests/a.yaml': system('shop', 'Shop') });
  assert.ok(!ok.sandbox.renderElementsPerspectiveHtml().left.includes('nav-duplicate-note'));
  assert.equal(ok.sandbox.renderDuplicateReferencesHtml(), '');
});

test('fixing the duplicate in the editor clears the report, and making one raises it', async () => {
  const { sandbox, state } = await open({
    'manifests/a.yaml': system('shop', 'Shop'),
    'manifests/b.yaml': system('mail', 'Mail')
  });
  assert.deepEqual(messages(state), []);
  sandbox.commitFileEdit('manifests/b.yaml', system('shop', 'Mail turned into a copy'));
  assert.deepEqual(messages(state), [
    'the reference `shop` is declared twice: in `manifests/a.yaml` and `manifests/b.yaml`'
  ]);
  sandbox.commitFileEdit('manifests/b.yaml', system('mail', 'Mail'));
  assert.deepEqual(messages(state), []);
});

test('a closed and reopened folder starts from no duplicate', async () => {
  const { sandbox, state } = await open({
    'manifests/a.yaml': system('shop', 'Shop'),
    'manifests/b.yaml': system('shop', 'Shop')
  });
  assert.equal(state.duplicateReferences.length, 1);
  const mem = memFolder({
    '.archicode.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n',
    'manifests/a.yaml': system('shop', 'Shop')
  });
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(sandbox.__state().duplicateReferences.length, 0);
});

test('no diagram is drawn from a model with a duplicate; one with only a duplicate view is drawn', async () => {
  for (const [files, drawn] of [
    [Object.assign(fixtureFiles(), { 'manifests/app.copy.yaml': fixtureFiles()['manifests/app.mailer.yaml'] }), false],
    [
      Object.assign(fixtureFiles(), { 'manifests/view.v1.yaml': view('v1'), 'manifests/view.v1b.yaml': view('v1') }),
      true
    ]
  ]) {
    const { sandbox, state } = await open(files);
    assert.equal(state.duplicateReferences.length, 1);
    const canvas = { id: 'diagram-canvas' };
    sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
    const scenes = [];
    run(
      sandbox,
      'diagramRecipeOf = (canvas) => ({ isMap: false, reference: "shop", record: findElementRecord("shop", "application"), viewpoint: "overview", facet: null, mapState: null, shows: {}, hideUnlinked: false, layer: "application", host: "" });'
    );
    run(sandbox, 'showDiagramScene = (scene) => { globalThis.__scenes.push(scene); };');
    sandbox.__scenes = scenes;
    sandbox.console = Object.assign({}, console, { error() {} }); // the layout engine is not loaded here: the draw ends on its own error
    run(sandbox, 'loadElk = async () => { throw new Error("no layout in this test"); };');
    sandbox.mountDiagramIfNeeded();
    await new Promise((resolve) => setTimeout(resolve, 20));
    if (!drawn) {
      assert.equal(scenes.length, 1);
      assert.ok(
        String(scenes[0].html).includes('Nothing is drawn') &&
          String(scenes[0].html).includes('<code>mailer</code> is declared twice'),
        String(scenes[0].html)
      );
    } else {
      assert.ok(
        !scenes.some((scene) => String(scene.html).includes('Nothing is drawn')),
        'a duplicate view does not stop the drawing of elements'
      );
    }
  }
});
