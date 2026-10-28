'use strict';
// The sample from a page served by `archicode editor serve` (wave 025, run 0193, task-006; TDD DEC-8, RISK-5, RISK-10, REQ-6, REQ-12, TG-5, IMP-6): the browser workspace
// that holds the sample is a copy kept in this browser, and the served folder is only left and come back to. The server is played by `served-fake.js` (a temporary copy of
// the fixture behind the /api/fs/ routes, and the route of the sample), and every request the page sends is logged, so the tests say what was asked of the server:
// while the browser workspace is open (opening the sample, an edit saved, an export, a reset) not one request goes to /api/fs/, and in the whole run no PUT and no DELETE
// is sent and the copy of the served folder keeps its hash. The real edge functions run (`fetchSampleBundle` against the fake server); only `startBundleDownload` is replaced,
// since a node test has no download.
//
// Written before the code (red): each fails because the page has no `workspaceIsServedFolder`, `openSample` or menu action, or because a bar still says nothing of the way
// back. The names it fixes (task-009 and task-010 write to them): the actions `workspace-open-sample`, `workspace-export`, `workspace-ask-reset`, `workspace-confirm-reset`,
// `toggle-workspace-menu` and `back-to-served-folder` of the delegated click handler; `workspaceIsServedFolder()`; the close slot of a browser workspace opened in a served page
// reads `Back to the served folder`; the `confirm` of unsaved changes or a typed draft names the unsaved changes (`/unsaved/`).
// The existing server-mode.test.js is not edited and keeps passing. Bytes are never printed (CON-8).
// Run with: node --test src/test/javascript/viewpoint-kernel/sample-served-mode.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp, fakeIndexedDB, waitFor } = require('./harness');
const { TOKEN, fakeServer } = require('./served-fake');

const FDB = 'archicode-standalone-editor';
const BDB = 'archicode-browser-workspaces';
const SYSTEM = (id, name) =>
  'header:\n  kind: archicode.morin.io/system\n  version: "1"\ncontent:\n  id: ' + id + '\n  name: ' + name + '\n';
const SAMPLE_FILES = {
  '.archicode.yaml': 'settings:\n  name: Brightcart\n',
  'manifests/app.s1.yaml': SYSTEM('s1', 'S1'),
  'manifests/app.s2.yaml': SYSTEM('s2', 'S2')
};

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const codec = createApp();
function bundleTextOf(files) {
  const list = Object.entries(files).map(([file, text]) => ({
    path: file,
    bytes: Uint8Array.from(Buffer.from(text, 'utf8'))
  }));
  return codec.bundleWorkspaceFiles(list).text;
}

/** A click on an element with this action, as the delegated handler of the page gets it. */
function click(sandbox, action, workspace) {
  const attributes = { 'data-action': action };
  if (workspace !== undefined) attributes['data-workspace-id'] = workspace;
  const element = { getAttribute: (name) => (name in attributes ? attributes[name] : null) };
  sandbox.handleAppClick({ target: { closest: () => element, classList: { contains: () => false } }, detail: 1 });
}

/** A served page with the folder of the server open, the store probed, `confirm` answered by `box.answer` and the downloads logged. */
async function served() {
  const server = fakeServer({ sample: bundleTextOf(SAMPLE_FILES) });
  const idb = fakeIndexedDB();
  const sandbox = createApp({ serverToken: TOKEN, fetch: server.fetch, indexedDB: idb, withFile: true });
  sandbox.console.error = () => {};
  const box = { answer: true, confirms: [], downloads: [] };
  sandbox.confirm = (message) => {
    box.confirms.push(String(message));
    return box.answer;
  };
  sandbox.startBundleDownload = (fileName, text) => {
    box.downloads.push({ fileName, length: text.length });
    return true;
  };
  await sandbox.openServedFolder();
  await sandbox.probeBrowserStore();
  assert.equal(sandbox.__state().fatalError, null);
  assert.equal(sandbox.__state().folder.name, 'architecture');
  return { server, idb, sandbox, box };
}

const fsRequests = (server, from = 0) => server.requests.slice(from).filter((r) => r.url.includes('/api/fs/'));
const describeRequests = (list) => list.map((r) => r.method + ' ' + r.url).join('; ');
const browserWorkspaceOpen = (sandbox) => {
  const state = sandbox.__state();
  return !!(state.folder && state.folder.browserWorkspace && state.workspace && run(sandbox, 'landingBusy') === null);
};
const servedFolderOpen = (sandbox) => {
  const state = sandbox.__state();
  return !!(state.folder && !state.folder.browserWorkspace && state.folder.name === 'architecture' && state.workspace);
};
const records = (idb) => (idb.dump(BDB) || { stores: { records: {} } }).stores.records;
const workspaceRecords = (idb) => Object.values(records(idb)).filter((r) => r.kind === 'workspace');
const rename = (sandbox, reference, name) =>
  sandbox.commitElementEdit(reference, (node) => {
    node.name = name;
    return {};
  });

test('opening the sample, an edit saved, an export, a reset and the way back send no PUT and no DELETE and nothing to /api/fs/ while the browser workspace is open', async () => {
  const { server, idb, sandbox, box } = await served();
  const treeBefore = server.treeHash();
  const mark = server.requests.length;

  click(sandbox, 'workspace-open-sample');
  await waitFor(() => browserWorkspaceOpen(sandbox), 'the sample to open');
  const opened = workspaceRecords(idb);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].name, 'Brightcart');
  assert.equal(opened[0].origin, 'sample');
  assert.ok(
    server.requests.slice(mark).some((r) => r.method === 'GET' && /samples\/brightcart\.yaml$/.test(r.url)),
    'the sample was fetched from the server of the page'
  );

  rename(sandbox, 's1', 'Edited');
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success');
  assert.ok(
    Buffer.from(records(idb)['file:' + opened[0].id + '/manifests/app.s1.yaml'].bytes)
      .toString('utf8')
      .includes('Edited'),
    'saved in the browser'
  );

  click(sandbox, 'workspace-export');
  await waitFor(() => box.downloads.length === 1, 'the export');
  assert.equal(box.downloads[0].fileName, 'brightcart-bundle.yaml');

  click(sandbox, 'workspace-ask-reset');
  click(sandbox, 'workspace-confirm-reset');
  await waitFor(
    () =>
      browserWorkspaceOpen(sandbox) &&
      !Buffer.from(records(idb)['file:' + opened[0].id + '/manifests/app.s1.yaml'].bytes)
        .toString('utf8')
        .includes('Edited'),
    'the reset'
  );

  assert.equal(
    describeRequests(fsRequests(server, mark)),
    '',
    'not one request to /api/fs/ while the browser workspace is open'
  );

  const back = server.requests.length;
  click(sandbox, 'back-to-served-folder');
  await waitFor(() => servedFolderOpen(sandbox), 'the served folder');
  assert.ok(fsRequests(server, back).length > 0, 'the served folder is read again');
  const writes = server.requests.filter((r) => r.method !== 'GET');
  assert.equal(describeRequests(writes), '', 'no PUT, no DELETE, no other method in the whole run');
  assert.equal(server.treeHash(), treeBefore, 'the folder of the server is byte for byte what it was');
  assert.equal(sandbox.workspaceIsServedFolder(), true);
});

test('choosing the sample with unsaved changes asks the confirm of Back to the served folder: refused, nothing is opened; accepted, the sample opens', async () => {
  const { server, idb, sandbox, box } = await served();
  rename(sandbox, 'shop.web', 'Edited');
  assert.ok(sandbox.hasUnsavedChanges());
  const mark = server.requests.length;

  box.answer = false;
  click(sandbox, 'workspace-open-sample');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(box.confirms.length, 1, 'asked once');
  assert.match(box.confirms[0], /unsaved/);
  assert.equal(workspaceRecords(idb).length, 0, 'no workspace was created');
  assert.equal(server.requests.slice(mark).length, 0, 'the sample was not even fetched');
  assert.ok(servedFolderOpen(sandbox), 'the served folder is still shown');
  assert.ok(sandbox.hasUnsavedChanges(), 'with its edit');

  box.answer = true;
  click(sandbox, 'workspace-open-sample');
  await waitFor(() => browserWorkspaceOpen(sandbox), 'the sample to open');
  assert.equal(box.confirms.length, 2);
  assert.deepEqual(
    workspaceRecords(idb).map((r) => r.name),
    ['Brightcart']
  );
  assert.equal(describeRequests(server.requests.filter((r) => r.method !== 'GET')), '');
});

test('a typed draft counts as unsaved for the confirm, and nothing pending asks nothing', async () => {
  const draft = await served();
  run(draft.sandbox, 'draftTyped = true');
  draft.box.answer = false;
  click(draft.sandbox, 'workspace-open-sample');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(draft.box.confirms.length, 1, 'asked for a typed draft');
  assert.equal(workspaceRecords(draft.idb).length, 0);
  assert.ok(servedFolderOpen(draft.sandbox));

  const clear = await served();
  click(clear.sandbox, 'workspace-open-sample');
  await waitFor(() => browserWorkspaceOpen(clear.sandbox), 'the sample to open');
  assert.equal(clear.box.confirms.length, 0, 'nothing pending, no question');
});

test('Back to the served folder asks the confirm for unsaved edits of the sample and keeps them when refused', async () => {
  const { sandbox, box } = await served();
  click(sandbox, 'workspace-open-sample');
  await waitFor(() => browserWorkspaceOpen(sandbox), 'the sample to open');
  rename(sandbox, 's1', 'Edited');
  box.answer = false;
  click(sandbox, 'back-to-served-folder');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(box.confirms.length, 1);
  assert.ok(browserWorkspaceOpen(sandbox), 'still in the sample');
  assert.ok(sandbox.hasUnsavedChanges());
  box.answer = true;
  click(sandbox, 'back-to-served-folder');
  await waitFor(() => servedFolderOpen(sandbox), 'the served folder');
  assert.equal(sandbox.hasUnsavedChanges(), false, 'the state of the sample is dropped');
});

test('the close slot follows workspaceIsServedFolder(): nothing for the served folder, Back to the served folder for the sample', async () => {
  const { sandbox } = await served();
  assert.equal(sandbox.isServedByArchiCode(), true);
  assert.equal(sandbox.workspaceIsServedFolder(), true);
  let bar = sandbox.renderTopPanelHtml();
  assert.doesNotMatch(bar, /close-folder|back-to-served-folder/, 'there is no other folder to close');

  click(sandbox, 'workspace-open-sample');
  await waitFor(() => browserWorkspaceOpen(sandbox), 'the sample to open');
  assert.equal(sandbox.isServedByArchiCode(), true, 'the page still has a server');
  assert.equal(sandbox.workspaceIsServedFolder(), false, 'what is open is not its folder');
  bar = sandbox.renderTopPanelHtml();
  assert.match(bar, /data-action="back-to-served-folder"[^>]*>Back to the served folder</);
  assert.doesNotMatch(bar, /data-action="close-folder"/);
});

test('the help sentence follows workspaceIsServedFolder(): the served folder, then the browser', async () => {
  const { sandbox } = await served();
  run(sandbox, 'helpOpen = true');
  assert.match(sandbox.renderHelpMenuHtml(), /folder served by <code>archicode editor serve<\/code>/);
  click(sandbox, 'workspace-open-sample');
  await waitFor(() => browserWorkspaceOpen(sandbox), 'the sample to open');
  run(sandbox, 'helpOpen = true');
  const help = sandbox.renderHelpMenuHtml();
  assert.match(help, /in this browser/);
  assert.doesNotMatch(help, /folder served by/);
});

test('the other nine reads of isServedByArchiCode() stay as they were while the sample is open: folder access, no list, no remembered folder, no card', async () => {
  const { server, idb, sandbox } = await served();
  const foldersBefore = JSON.stringify(idb.dump(FDB));
  click(sandbox, 'workspace-open-sample');
  await waitFor(() => browserWorkspaceOpen(sandbox), 'the sample to open');
  const mark = server.requests.length;

  assert.equal(sandbox.isFolderAccessAvailable(), true, 'a served page has folder access whatever is open');
  assert.equal(sandbox.landingScreenConfig(), null, 'no card while a workspace is open');
  assert.deepEqual(Array.from(sandbox.landingFolderRows()), [], 'a served page lists no folders');

  // the three functions that read the id of the open folder, which a browser workspace has null (IMP-6)
  await sandbox.retryFolder();
  assert.ok(browserWorkspaceOpen(sandbox), 'Try again reloads the same browser workspace');
  sandbox.commitSettingsEdit((settings) => {
    settings.name = 'Named in Settings';
  });
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success');
  assert.equal(JSON.stringify(idb.dump(FDB)), foldersBefore, 'the remembered folders were not touched');
  assert.equal(describeRequests(fsRequests(server, mark)), '');
});

test('the menu of a served page offers the sample once the store is ready, with the title that says where the copy is kept, and no other item', async () => {
  const { sandbox } = await served();
  assert.equal(run(sandbox, 'browserStoreState'), 'ready');
  let bar = sandbox.renderTopPanelHtml();
  assert.match(bar, /data-action="toggle-workspace-menu"/);
  sandbox.setWorkspaceMenuOpen(true);
  bar = sandbox.renderTopPanelHtml();
  assert.match(bar, /data-action="workspace-open-sample"/);
  assert.match(bar, /Open the Brightcart sample/);
  assert.match(
    bar,
    /A copy kept in this browser for this address \(host and port\)\. The served folder is not touched\./
  );
  assert.doesNotMatch(bar, /data-action="workspace-export"|data-action="workspace-ask-reset"/);

  const unavailable = createApp({
    serverToken: TOKEN,
    fetch: fakeServer().fetch,
    indexedDB: fakeIndexedDB({ failOpen: 'SecurityError' }),
    withFile: true
  });
  unavailable.console.error = () => {};
  await unavailable.openServedFolder();
  await unavailable.probeBrowserStore();
  assert.doesNotMatch(unavailable.renderTopPanelHtml(), /toggle-workspace-menu/, 'no store, no menu');
});
