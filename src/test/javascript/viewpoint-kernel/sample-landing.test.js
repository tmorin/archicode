'use strict';
// The card, the Workspace menu and the address of the sample (wave 025, run 0193, task-006; TDD DEC-4, DEC-7, DEC-9, DEC-11, DEC-13, IF-1 to IF-4, ASM-7, CON-2, RISK-7;
// gap-001 decisions 3 and 10): everything of this run that needs a presentation or a composition name. The flows themselves are bundle-flows.test.js (which names none of
// them), the request log of a served page is sample-served-mode.test.js. These tests read the configuration of the card (`landingScreenConfig`), the markup of the card and of
// the bar (`#app`'s innerHTML, `renderTopPanelHtml()`), go through the delegated click handler (`handleAppClick`) and the keydown listeners of the document, and load the
// page as a browser does (the `DOMContentLoaded` listeners). Three of the four edge functions are replaced on the sandbox, as in bundle-flows.test.js
// (`fetchSampleBundle`, `bundleFilePicker`, `startBundleDownload`), so that no test has a network, a picker or a download.
//
// Written before the code (red): each fails because the page has no `open-sample` action, no `sampleFromHash`, no Workspace menu, ... Where the TDD leaves a name open this file
// fixes it (task-010 writes to it):
//   - card actions, in this order: `open-sample` (Open the Brightcart sample), `new-browser-workspace`, `open-folder`, `import-bundle` (Import a workspace file); a row has
//     `export-browser-workspace` between Rename and Delete (aria-label `Export “name”`), the delete question has `export-browser-workspace-first` (text `Export first`) between
//     `cancel-browser-workspace-question` and `delete-browser-workspace`;
//   - the bar: `toggle-workspace-menu` (aria-haspopup, aria-expanded) and, open, `<div class="workspace-menu" role="dialog" aria-label="Workspace">` with the items
//     `workspace-export` (Export as a file, `aria-disabled="true"` and the line `Save your changes first: the file holds what is saved.` while changes or a draft are pending),
//     `workspace-ask-reset` (Reset to the sample…), `workspace-open-sample` (Open the Brightcart sample), and the question with `workspace-cancel-question` and
//     `workspace-confirm-reset` (aria-label `Reset “name”`); the menu opens and closes without a redraw (`setWorkspaceMenuOpen(open, options)`);
//   - the address: `sampleFromHash()` returns the value of `sample` in the query of the hash, or null; a card notice `There is no sample “x”.` for an id that is not in the catalog.
// Bytes are never printed (CON-8). Run with: node --test src/test/javascript/viewpoint-kernel/sample-landing.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { createApp, fakeIndexedDB, makeDirHandle, waitFor } = require('./harness');
const { TOKEN, fakeServer } = require('./served-fake');

const BDB = 'archicode-browser-workspaces';
const SYSTEM = (id, name) =>
  'header:\n  kind: archicode.morin.io/system\n  version: "1"\ncontent:\n  id: ' + id + '\n  name: ' + name + '\n';
const SAMPLE_FILES = {
  '.archicode.yaml': 'settings:\n  name: Brightcart\n',
  'manifests/app.s1.yaml': SYSTEM('s1', 'S1'),
  'manifests/app.s2.yaml': SYSTEM('s2', 'S2')
};
const SHOP_FILES = {
  '.archicode.yaml': '# A workspace.\nsettings:\n  name: Shop\n',
  'manifests/app.s1.yaml': SYSTEM('s1', 'S1')
};
const SAMPLE_PATH = path.resolve(__dirname, '../../../main/resources/editor-webapp/samples/brightcart.yaml');
const ADDRESS = '#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart';
const MARKUP_NAME = '<img src=x onerror=alert(1)>';
const QUOTE_NAME = 'x" autofocus onfocus="alert(1)';

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const encode = (text) => new TextEncoder().encode(text);
const html = (sandbox) => run(sandbox, "document.getElementById('app').innerHTML");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const unescaped = (text) =>
  text
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const textOf = (markup) => unescaped(markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));

function recordsOf(workspaces, last) {
  const out = {};
  for (const w of workspaces) {
    out['workspace:' + w.id] = Object.assign(
      {
        kind: 'workspace',
        id: w.id,
        name: w.name,
        createdAt: 1000,
        openedAt: w.openedAt || 1000,
        lastExportAt: null,
        origin: 'blank'
      },
      w.record || {}
    );
    for (const [file, text] of Object.entries(w.files || SHOP_FILES))
      out['file:' + w.id + '/' + file] = {
        kind: 'file',
        workspace: w.id,
        path: file,
        bytes: encode(text),
        modified: 2000
      };
  }
  if (last) out.last = last;
  return out;
}
const seedBrowser = (idb, workspaces, last) => idb.seed(BDB, 1, { records: recordsOf(workspaces, last) });
const browserRecords = (idb) => (idb.dump(BDB) || { stores: { records: {} } }).stores.records;
const workspaceRecords = (idb) => Object.values(browserRecords(idb)).filter((r) => r.kind === 'workspace');
const workspaceNames = (idb) =>
  workspaceRecords(idb)
    .map((r) => r.name)
    .sort();

const codec = createApp();
function bundleTextOf(files) {
  const list = Object.entries(files).map(([file, text]) => ({
    path: file,
    bytes: Uint8Array.from(Buffer.from(text, 'utf8'))
  }));
  return codec.bundleWorkspaceFiles(list).text;
}
function bytesIn(sandbox, text) {
  const source = Buffer.from(text, 'utf8');
  const bytes = run(sandbox, 'new Uint8Array(' + source.length + ')');
  bytes.set(source);
  return bytes;
}
const listOf = (sandbox, files) =>
  Object.entries(files).map(([file, text]) => ({ path: file, bytes: bytesIn(sandbox, text) }));
function committedSample() {
  const unbundled = codec.unbundleWorkspaceFiles(fs.readFileSync(SAMPLE_PATH, 'utf8'));
  assert.equal(unbundled.problems.length, 0);
  const files = {};
  for (const file of unbundled.files) files[file.path] = Buffer.from(file.bytes).toString('utf8');
  return files;
}

/** The edges replaced: the log has `fetches` (ids), `downloads` and `pickers`; `config.sample`: the files `fetchSampleBundle` gives (SAMPLE_FILES). */
function edges(sandbox, config = {}) {
  const log = { fetches: [], downloads: [], pickers: [] };
  sandbox.fetchSampleBundle = async (id) => {
    log.fetches.push(id);
    return { files: listOf(sandbox, config.sample || SAMPLE_FILES), problem: null };
  };
  sandbox.startBundleDownload = (fileName, text) => {
    log.downloads.push({ fileName, length: text.length });
    return true;
  };
  sandbox.bundleFilePicker = (onFile) => {
    log.pickers.push(onFile);
  };
  return log;
}

function page(idb, options = {}) {
  const sandbox = createApp(Object.assign({ indexedDB: idb, withFile: true }, options.app));
  sandbox.console.error = () => {};
  if (options.picker) sandbox.window.showDirectoryPicker = async () => undefined;
  const log = edges(sandbox, options);
  return { sandbox, log };
}

/** A page whose store was probed and list read, with the card drawn. */
async function ready(idb, options) {
  const { sandbox, log } = page(idb, options);
  await sandbox.probeBrowserStore();
  await sandbox.refreshBrowserWorkspaces();
  sandbox.render();
  return { sandbox, log };
}

const settled = (sandbox) => {
  const state = sandbox.__state();
  if (run(sandbox, 'landingBusy') !== null || run(sandbox, 'browserStoreState') === 'unknown') return false;
  const card = sandbox.landingScreenConfig();
  return !!(state.workspace || state.fatalError || (card && card.kind !== 'busy'));
};

/** A load of the page as the browser does it: the address, then DOMContentLoaded, and whatever starts by itself. */
async function load(idb, options = {}) {
  const made = page(idb, options);
  if (options.hash !== undefined) made.sandbox.location.hash = options.hash;
  for (const listener of made.sandbox.__documentListeners.DOMContentLoaded) listener();
  await waitFor(() => settled(made.sandbox), 'the page to settle', 30000);
  return made;
}

function click(sandbox, action, workspace) {
  const attributes = { 'data-action': action };
  if (workspace !== undefined) attributes['data-workspace-id'] = workspace;
  const element = { getAttribute: (name) => (name in attributes ? attributes[name] : null) };
  sandbox.handleAppClick({ target: { closest: () => element, classList: { contains: () => false } }, detail: 1 });
}
/** A click on nothing that acts, outside the menu (`inside`: on the menu itself, on nothing that acts). */
function clickElsewhere(sandbox, inside) {
  sandbox.handleAppClick({
    target: {
      closest: (selector) => (inside && selector === '.workspace-menu' ? {} : null),
      classList: { contains: () => false }
    },
    detail: 1
  });
}
function escape(sandbox) {
  const event = {
    key: 'Escape',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    defaultPrevented: false,
    isComposing: false,
    target: { tagName: 'BODY', closest: () => null },
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
  for (const listener of sandbox.__documentListeners.keydown || []) listener(event);
  return event;
}

/** The opening tag of the button with this action (and workspace), or null. */
function button(markup, action, workspace) {
  const tags = markup.match(/<button\b[^>]*>/g) || [];
  return (
    tags.find(
      (tag) =>
        tag.includes('data-action="' + action + '"') &&
        (workspace === undefined || tag.includes('data-workspace-id="' + workspace + '"'))
    ) || null
  );
}
const label = (tag) => unescaped((tag.match(/aria-label="([^"]*)"/) || ['', ''])[1]);
const rename = (sandbox, id, name) =>
  sandbox.commitElementEdit(id, (node) => {
    node.name = name;
    return {};
  });

/** The sample open in a page, with the bar drawn: the state of a visitor who came by the site button. */
async function openedSample(options) {
  const idb = fakeIndexedDB();
  const made = await ready(idb, options);
  await made.sandbox.openSample('brightcart');
  return Object.assign({ idb }, made);
}

// ---- the address (DEC-7, CTR-4) ----

test('sampleFromHash is the value of sample in the query of the hash, or null', () => {
  const { sandbox } = page(fakeIndexedDB());
  const read = (hash) => {
    sandbox.location.hash = hash;
    return sandbox.sampleFromHash();
  };
  assert.equal(read('#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart'), 'brightcart');
  assert.equal(read('#/timeline/applications?sample=brightcart&plateau=baseline'), 'brightcart');
  assert.equal(read('#/timeline/applications'), null);
  assert.equal(read('#/timeline/applications?plateau=baseline'), null);
  assert.equal(read('#/timeline/applications?samples=brightcart'), null, 'another key');
  assert.equal(read(''), null);
  assert.equal(
    read('#/timeline/applications?sample=nope'),
    'nope',
    'the catalog is looked at by the start of the page, not here'
  );
});

test('the link of the site: sample= is read before the first render, the workspace is created and drawn at the plateau and the comparison of the link, and the address loses it', async () => {
  const idb = fakeIndexedDB();
  const made = page(idb, { sample: committedSample() });
  const { sandbox, log } = made;
  const events = [];
  const realSample = sandbox.sampleFromHash;
  sandbox.sampleFromHash = () => {
    events.push('sample:' + sandbox.location.hash.includes('sample=brightcart'));
    return realSample();
  };
  const realRender = sandbox.render;
  sandbox.render = (...args) => {
    events.push('render');
    return realRender(...args);
  };
  sandbox.location.hash = ADDRESS;
  for (const listener of sandbox.__documentListeners.DOMContentLoaded) listener();
  await waitFor(
    () => settled(sandbox) && sandbox.__state().workspace && sandbox.__state().baseline,
    'the sample to open and the comparison to be drawn',
    30000
  );

  assert.equal(events[0], 'sample:true', 'the key is read, with the address intact, before anything is drawn');
  assert.ok(events.includes('render'));
  assert.deepEqual(log.fetches, ['brightcart']);
  assert.deepEqual(workspaceNames(idb), ['Brightcart']);
  const state = sandbox.__state();
  assert.equal(state.folder.browserWorkspace, workspaceRecords(idb)[0].id);
  assert.equal(state.fatalError, null);
  assert.equal(state.layers.current, 'marketplace');
  assert.equal(state.layers.compare.mode, 'past');
  assert.equal(state.layers.compare.other, 'inhouse');
  assert.ok(sandbox.comparisonState().changes.length > 0);
  assert.doesNotMatch(sandbox.location.hash, /sample/, 'the address the page writes has no sample');
  assert.match(sandbox.location.hash, /plateau=marketplace/);
});

test('the same link a second time opens the same workspace, with its changes, and fetches nothing', async () => {
  const idb = fakeIndexedDB();
  const first = await load(idb, {
    hash: ADDRESS.replace('plateau=marketplace&compare=past&', ''),
    sample: SAMPLE_FILES
  });
  assert.ok(first.sandbox.__state().workspace, 'the first visit opened the sample');
  rename(first.sandbox, 's1', 'Edited');
  await first.sandbox.saveAllChanges();
  assert.equal(run(first.sandbox, 'saveStatus.state'), 'success');

  const second = await load(idb, {
    hash: ADDRESS.replace('plateau=marketplace&compare=past&', ''),
    sample: SAMPLE_FILES
  });
  assert.equal(second.log.fetches.length, 0);
  assert.deepEqual(workspaceNames(idb), ['Brightcart'], 'not duplicated');
  assert.ok(
    second.sandbox
      .__state()
      .manifestFiles.find((f) => f.relPath === 'manifests/app.s1.yaml')
      .rawText.includes('Edited')
  );
});

test('an explicit sample wins over the workspace that reopens by itself', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }], { id: 'bw-a', openedAt: Date.now() });
  const { sandbox } = await load(idb, { hash: '#/timeline/applications?sample=brightcart', sample: SAMPLE_FILES });
  assert.deepEqual(workspaceNames(idb), ['Brightcart', 'Shop']);
  assert.notEqual(sandbox.__state().folder.browserWorkspace, 'bw-a');
  assert.equal(sandbox.__state().folder.name, 'Brightcart');
});

test('an id that is not in the catalog is said on the card, fetches nothing and leaves the usual start', async () => {
  const idb = fakeIndexedDB();
  const { sandbox, log } = await load(idb, { hash: '#/timeline/applications?sample=nope' });
  assert.equal(log.fetches.length, 0);
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'first-launch');
  assert.equal(card.notice, 'There is no sample “nope”.');
  assert.deepEqual(workspaceNames(idb), []);

  const reopen = fakeIndexedDB();
  seedBrowser(reopen, [{ id: 'bw-a', name: 'Shop' }], { id: 'bw-a', openedAt: Date.now() });
  const again = await load(reopen, { hash: '#/timeline/applications?sample=nope' });
  assert.equal(again.sandbox.__state().folder.browserWorkspace, 'bw-a', 'the last workspace reopens as usual');
  assert.equal(again.log.fetches.length, 0);
});

test('a store that is not available leaves the unsupported card and fetches nothing', async () => {
  const idb = fakeIndexedDB({ failOpen: 'SecurityError' });
  const { sandbox, log } = await load(idb, { hash: ADDRESS });
  assert.equal(sandbox.landingScreenConfig().kind, 'unsupported');
  assert.equal(log.fetches.length, 0);
});

test('a served page ignores the key: the served folder opens, the sample is not fetched and no workspace is made', async () => {
  const server = fakeServer({ sample: bundleTextOf(SAMPLE_FILES) });
  const idb = fakeIndexedDB();
  const { sandbox } = page(idb, { app: { serverToken: TOKEN, fetch: server.fetch } });
  sandbox.location.hash = ADDRESS;
  for (const listener of sandbox.__documentListeners.DOMContentLoaded) listener();
  await waitFor(() => sandbox.__state().workspace && run(sandbox, 'landingBusy') === null, 'the served folder', 30000);
  assert.equal(sandbox.__state().folder.name, 'architecture');
  assert.equal(sandbox.__state().folder.browserWorkspace, undefined);
  assert.equal(server.requests.filter((r) => /samples\//.test(r.url)).length, 0);
  assert.deepEqual(workspaceNames(idb), []);
});

test('a pasted link in an editor that is already open does nothing', async () => {
  const idb = fakeIndexedDB();
  const { sandbox, log } = await load(idb, { hash: '' });
  sandbox.location.hash = '#/timeline/applications?sample=brightcart';
  for (const listener of sandbox.__windowListeners.hashchange || []) listener();
  await pause(50);
  assert.equal(log.fetches.length, 0);
  assert.deepEqual(workspaceNames(idb), []);
});

// ---- the card (DEC-11, IF-1) ----

const actionsOf = (card) => plain(card.actions.map((a) => [a.action, !!a.primary]));

test('first visit: the sample is the primary action, then the new workspace, the folder where the browser has a picker, and the import', async () => {
  const { sandbox } = await ready(fakeIndexedDB());
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'first-launch');
  assert.deepEqual(actionsOf(card), [
    ['open-sample', true],
    ['new-browser-workspace', false],
    ['import-bundle', false]
  ]);
  assert.deepEqual(plain(card.actions.map((a) => a.label)), [
    'Open the Brightcart sample',
    'New workspace in this browser',
    'Import a workspace file'
  ]);
  assert.equal((html(sandbox).match(/id="landing-primary"/g) || []).length, 1);
  assert.ok(button(html(sandbox), 'open-sample').includes('id="landing-primary"'));

  const withPicker = await ready(fakeIndexedDB(), { picker: true });
  assert.deepEqual(actionsOf(withPicker.sandbox.landingScreenConfig()), [
    ['open-sample', true],
    ['new-browser-workspace', false],
    ['open-folder', false],
    ['import-bundle', false]
  ]);
});

test('a visitor who has a workspace keeps the primary action W-4 chose; the sample and the import are still offered', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox } = await ready(idb);
  assert.deepEqual(actionsOf(sandbox.landingScreenConfig()), [
    ['open-sample', false],
    ['new-browser-workspace', true],
    ['import-bundle', false]
  ]);
  const withPicker = await ready(idb, { picker: true });
  assert.deepEqual(
    actionsOf(withPicker.sandbox.landingScreenConfig()).filter(([, primary]) => primary),
    [],
    'with a picker nothing is primary, as in W-4'
  );
});

test('the unsupported card is for a page with neither a picker nor a store; a picker alone offers the folder only', async () => {
  const none = page(fakeIndexedDB({ failOpen: 'SecurityError' }));
  await none.sandbox.probeBrowserStore();
  assert.equal(none.sandbox.landingScreenConfig().kind, 'unsupported');
  assert.doesNotMatch(
    JSON.stringify(plain(none.sandbox.landingScreenConfig().actions || [])),
    /open-sample|import-bundle/
  );

  const folders = page(fakeIndexedDB({ failOpen: 'SecurityError' }), { picker: true });
  await folders.sandbox.probeBrowserStore();
  const card = folders.sandbox.landingScreenConfig();
  assert.equal(card.kind, 'first-launch', 'a picker is enough for the card');
  assert.deepEqual(
    plain(card.actions.map((a) => a.action)),
    ['open-folder'],
    'the sample and the import need the store'
  );

  const storeOnly = await ready(fakeIndexedDB());
  assert.notEqual(storeOnly.sandbox.landingScreenConfig().kind, 'unsupported', 'a store is enough too');
});

test('the actions of the card are routed to the flows: the sample opens, the import asks the picker', async () => {
  const { sandbox, log } = await ready(fakeIndexedDB());
  click(sandbox, 'import-bundle');
  assert.equal(log.pickers.length, 1, 'the picker is asked in the turn of the click');
  click(sandbox, 'open-sample');
  await waitFor(
    () => sandbox.__state().folder && sandbox.__state().folder.browserWorkspace && sandbox.__state().workspace,
    'the sample'
  );
  assert.deepEqual(log.fetches, ['brightcart']);
});

test('a row has Export between Rename and Delete, named after the workspace; its second line says when it was last exported', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Orchard', record: { lastExportAt: 1700000000000 } }
  ]);
  const { sandbox, log } = await ready(idb);
  const markup = html(sandbox);
  const tag = button(markup, 'export-browser-workspace', 'bw-a');
  assert.ok(tag, 'an Export button on the row');
  assert.equal(label(tag), 'Export “Shop”');
  const row = markup.split('<li').find((chunk) => chunk.includes('data-workspace-id="bw-a"'));
  assert.ok(row.indexOf('rename-browser-workspace') < row.indexOf('export-browser-workspace'));
  assert.ok(row.indexOf('export-browser-workspace') < row.indexOf('ask-delete-browser-workspace'));
  assert.match(textOf(row), /Kept in this browser · Last exported: never/);
  const other = markup.split('<li').find((chunk) => chunk.includes('data-workspace-id="bw-b"'));
  assert.doesNotMatch(textOf(other), /Last exported: never/);
  assert.match(textOf(other), /Last exported: \S/);

  click(sandbox, 'export-browser-workspace', 'bw-a');
  await waitFor(() => log.downloads.length === 1, 'the export');
  assert.equal(log.downloads[0].fileName, 'shop-bundle.yaml');
  await waitFor(
    () => /Exported 2 files as shop-bundle\.yaml\./.test(String(run(sandbox, 'landingNotice'))),
    'the notice'
  );
});

test('the row of the sample says it is the Brightcart sample', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'My Brightcart', files: SAMPLE_FILES, record: { origin: 'sample', sample: 'brightcart' } }
  ]);
  const { sandbox } = await ready(idb);
  const row = html(sandbox)
    .split('<li')
    .find((chunk) => chunk.includes('data-workspace-id="bw-a"'));
  assert.match(textOf(row), /Brightcart sample/);
});

test('the delete question says when the workspace was last exported, offers Export first before Delete, and starts on Cancel; Export first leaves the question open', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox, log } = await ready(idb);
  click(sandbox, 'ask-delete-browser-workspace', 'bw-a');
  sandbox.render();
  let markup = html(sandbox);
  assert.match(
    textOf(markup),
    /Delete “Shop”\? It holds 2 files, last changed .* Last exported: never\. This cannot be undone\. Nothing on your disk is touched\./
  );
  const first = button(markup, 'export-browser-workspace-first', 'bw-a');
  assert.ok(first, 'Export first');
  assert.ok(markup.indexOf('cancel-browser-workspace-question') < markup.indexOf('export-browser-workspace-first'));
  assert.ok(
    markup.indexOf('export-browser-workspace-first') < markup.indexOf('data-action="delete-browser-workspace"')
  );
  assert.match(textOf(markup), /Export first/);
  assert.match(run(sandbox, 'landingFocusSelector'), /cancel-browser-workspace-question/);
  assert.doesNotMatch(button(markup, 'delete-browser-workspace', 'bw-a'), /autofocus|id="landing-primary"/);

  click(sandbox, 'export-browser-workspace-first', 'bw-a');
  await waitFor(() => log.downloads.length === 1, 'the export');
  await waitFor(() => browserRecords(idb)['workspace:bw-a'].lastExportAt > 0, 'the time');
  await sandbox.refreshBrowserWorkspaces();
  assert.equal(run(sandbox, 'landingPendingDelete'), 'bw-a', 'the question is still open');
  sandbox.render();
  markup = html(sandbox);
  assert.doesNotMatch(textOf(markup), /Last exported: never/, 'the line updated');
  assert.match(textOf(markup), /Last exported: \S/);
  assert.ok(button(markup, 'delete-browser-workspace', 'bw-a'));
});

// ---- the Workspace menu (DEC-9, IF-3) ----

const menuOf = (sandbox) => {
  const bar = sandbox.renderTopPanelHtml();
  const start = bar.indexOf('<div class="workspace-menu"');
  return start === -1 ? '' : bar.slice(start, bar.indexOf('</header>', start));
};

test('the menu by mode: a browser workspace has Export, the sample also Reset, the served folder the sample, a folder of the disk nothing', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Brightcart', files: SAMPLE_FILES, record: { origin: 'sample', sample: 'brightcart' } }
  ]);
  const { sandbox } = await ready(idb);
  await sandbox.openBrowserWorkspace('bw-a');
  let bar = sandbox.renderTopPanelHtml();
  const toggle = button(bar, 'toggle-workspace-menu');
  assert.ok(toggle, 'the Workspace button');
  assert.match(toggle, /aria-haspopup/);
  assert.match(toggle, /aria-expanded="false"/);
  assert.ok(bar.indexOf('toggle-workspace-menu') < bar.indexOf('toggle-help'), 'before the help button');
  assert.equal(menuOf(sandbox), '', 'closed');

  sandbox.setWorkspaceMenuOpen(true);
  bar = sandbox.renderTopPanelHtml();
  assert.match(button(bar, 'toggle-workspace-menu'), /aria-expanded="true"/);
  let menu = menuOf(sandbox);
  assert.match(menu, /role="dialog"/);
  assert.match(menu, /aria-label="Workspace"/);
  assert.ok(button(menu, 'workspace-export'));
  assert.match(textOf(menu), /Export as a file/);
  assert.match(textOf(menu), /Last exported: never/);
  assert.equal(button(menu, 'workspace-ask-reset'), null, 'a workspace that is not the sample has no Reset');
  assert.equal(button(menu, 'workspace-open-sample'), null);

  sandbox.setWorkspaceMenuOpen(false);
  await sandbox.openBrowserWorkspace('bw-b');
  sandbox.setWorkspaceMenuOpen(true);
  menu = menuOf(sandbox);
  assert.ok(button(menu, 'workspace-export'));
  assert.ok(button(menu, 'workspace-ask-reset'));
  assert.match(textOf(menu), /Reset to the sample…/);
});

test('a folder of the disk has no Workspace menu', async () => {
  const idb = fakeIndexedDB();
  const { sandbox } = await ready(idb, { picker: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-sample-landing-'));
  fs.mkdirSync(path.join(dir, 'manifests'));
  fs.writeFileSync(path.join(dir, 'manifests', 'app.s1.yaml'), SYSTEM('s1', 'S1'));
  fs.writeFileSync(path.join(dir, '.archicode.yaml'), 'settings:\n  name: Disk\n');
  const handle = makeDirHandle(dir);
  sandbox.__state().folder = { handle, name: 'disk', id: null };
  sandbox.__state().permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.doesNotMatch(sandbox.renderTopPanelHtml(), /toggle-workspace-menu|workspace-menu/);
});

test('the menu opens and closes without a redraw; Escape and a click elsewhere close it, a click inside does not, choosing an item does', async () => {
  const { sandbox } = await openedSample();
  let renders = 0;
  const realRender = sandbox.render;
  sandbox.render = (...args) => {
    renders += 1;
    return realRender(...args);
  };
  click(sandbox, 'toggle-workspace-menu');
  assert.equal(run(sandbox, 'workspaceMenuOpen'), true);
  click(sandbox, 'toggle-workspace-menu');
  assert.equal(run(sandbox, 'workspaceMenuOpen'), false);
  click(sandbox, 'toggle-workspace-menu');
  clickElsewhere(sandbox, true);
  assert.equal(run(sandbox, 'workspaceMenuOpen'), true, 'a click on the menu itself keeps it');
  clickElsewhere(sandbox, false);
  assert.equal(run(sandbox, 'workspaceMenuOpen'), false, 'a click elsewhere closes it');
  click(sandbox, 'toggle-workspace-menu');
  const event = escape(sandbox);
  assert.equal(run(sandbox, 'workspaceMenuOpen'), false, 'Escape closes it');
  assert.equal(event.defaultPrevented, true);
  assert.equal(renders, 0, 'none of this drew the page again');
  assert.equal(escape(sandbox).defaultPrevented, false, 'Escape with the menu closed is left alone');

  click(sandbox, 'toggle-workspace-menu');
  click(sandbox, 'workspace-export');
  assert.equal(run(sandbox, 'workspaceMenuOpen'), false, 'choosing an item closes the menu');
});

test('Reset is a question inside the menu that names the workspace, says what is lost and starts with Cancel; Escape, Cancel and a click elsewhere change nothing', async () => {
  const { idb, sandbox } = await openedSample();
  rename(sandbox, 's1', 'Edited');
  rename(sandbox, 's2', 'Edited too');
  assert.equal(sandbox.countUnsavedChanges(), 2);
  const stored = JSON.stringify(browserRecords(idb), (key, value) =>
    ArrayBuffer.isView(value) ? Buffer.from(value).toString('base64') : value
  );

  click(sandbox, 'toggle-workspace-menu');
  click(sandbox, 'workspace-ask-reset');
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), 'reset-sample');
  assert.equal(run(sandbox, 'workspaceMenuOpen'), true, 'asking keeps the menu open');
  const menu = menuOf(sandbox);
  assert.match(
    textOf(menu),
    /Replace everything in “Brightcart” with the sample\? Your changes in it are lost\. Last exported: never\. 2 unsaved changes are lost too\./
  );
  const confirm = button(menu, 'workspace-confirm-reset');
  assert.ok(confirm);
  assert.equal(label(confirm), 'Reset “Brightcart”');
  assert.ok(
    menu.indexOf('workspace-cancel-question') < menu.indexOf('workspace-confirm-reset'),
    'Cancel comes first, and gets the focus'
  );
  assert.doesNotMatch(confirm, /autofocus/);

  const event = escape(sandbox);
  assert.equal(event.defaultPrevented, true);
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), null, 'Escape drops the question');
  assert.equal(run(sandbox, 'workspaceMenuOpen'), false, 'and closes the menu');
  click(sandbox, 'toggle-workspace-menu');
  click(sandbox, 'workspace-ask-reset');
  click(sandbox, 'workspace-cancel-question');
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), null);
  click(sandbox, 'workspace-ask-reset');
  clickElsewhere(sandbox, false);
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), null, 'a click elsewhere cancels it');
  assert.equal(sandbox.countUnsavedChanges(), 2, 'the edits are still there');
  assert.equal(
    JSON.stringify(browserRecords(idb), (key, value) =>
      ArrayBuffer.isView(value) ? Buffer.from(value).toString('base64') : value
    ),
    stored,
    'nothing was written'
  );
});

test('the question without unsaved changes does not mention them, and Reset in the menu does the reset', async () => {
  const { idb, sandbox, log } = await openedSample();
  click(sandbox, 'toggle-workspace-menu');
  click(sandbox, 'workspace-ask-reset');
  assert.doesNotMatch(textOf(menuOf(sandbox)), /unsaved/);
  click(sandbox, 'workspace-confirm-reset');
  await waitFor(
    () =>
      log.fetches.length === 2 &&
      sandbox.__state().workspace &&
      run(sandbox, 'landingBusy') === null &&
      run(sandbox, 'workspaceMenuQuestion') === null,
    'the reset'
  );
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), null);
  assert.equal(workspaceRecords(idb).length, 1);
});

// ---- Export from the bar while changes or a draft are pending (DEC-4, ASM-7) ----

test('Export from the menu is refused while changes are unsaved, with the sentence, and goes through once they are saved', async () => {
  const { sandbox, log } = await openedSample();
  rename(sandbox, 's1', 'Edited');
  sandbox.setWorkspaceMenuOpen(true);
  const item = button(menuOf(sandbox), 'workspace-export');
  assert.match(item, /aria-disabled="true"/);
  assert.match(textOf(menuOf(sandbox)), /Save your changes first: the file holds what is saved\./);
  click(sandbox, 'workspace-export');
  await pause(30);
  assert.equal(log.downloads.length, 0, 'nothing was exported');
  assert.equal(run(sandbox, 'bundleNotice'), 'Save your changes first: the file holds what is saved.');
  assert.match(
    textOf(sandbox.renderTopPanelHtml()),
    /Save your changes first: the file holds what is saved\./,
    'the bar says it'
  );

  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success');
  sandbox.setWorkspaceMenuOpen(true);
  assert.doesNotMatch(button(menuOf(sandbox), 'workspace-export'), /aria-disabled="true"/);
  assert.doesNotMatch(textOf(menuOf(sandbox)), /Save your changes first/);
  click(sandbox, 'workspace-export');
  await waitFor(() => log.downloads.length === 1, 'the export');
  assert.equal(log.downloads[0].fileName, 'brightcart-bundle.yaml');
  await waitFor(
    () => /^Exported 3 files as brightcart-bundle\.yaml\./.test(String(run(sandbox, 'bundleNotice'))),
    'the notice'
  );
  assert.match(textOf(sandbox.renderTopPanelHtml()), /Exported 3 files as brightcart-bundle\.yaml\./);
});

test('a typed draft that is not committed counts as unsaved for Export, as it does for Cancel and Save', async () => {
  const { sandbox, log } = await openedSample();
  run(sandbox, 'draftTyped = true');
  sandbox.setWorkspaceMenuOpen(true);
  assert.match(button(menuOf(sandbox), 'workspace-export'), /aria-disabled="true"/);
  click(sandbox, 'workspace-export');
  await pause(30);
  assert.equal(log.downloads.length, 0);
  assert.equal(run(sandbox, 'bundleNotice'), 'Save your changes first: the file holds what is saved.');
});

test('Export is allowed from the card, where nothing is open', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox, log } = await ready(idb);
  assert.equal(sandbox.countUnsavedChanges(), 0);
  click(sandbox, 'export-browser-workspace', 'bw-a');
  await waitFor(() => log.downloads.length === 1, 'the export');
});

// ---- what a name can do (Security and Privacy) ----

test('a name or a settings.name with markup or quotes is text everywhere: the card, the question, the bar, the menu', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: MARKUP_NAME },
    { id: 'bw-b', name: QUOTE_NAME },
    { id: 'bw-c', name: '<b>Sample</b>', files: SAMPLE_FILES, record: { origin: 'sample', sample: 'brightcart' } }
  ]);
  const { sandbox } = await ready(idb);
  const safe = (markup, where) => {
    assert.doesNotMatch(markup, /<img|<b>Sample/, where + ': no tag from a name');
    // the tags with the values of their attributes taken out: a name is text or the value of an attribute, never an attribute of its own
    const tags = (markup.match(/<[^>]*>/g) || []).map((tag) => tag.replace(/="[^"]*"/g, '=""')).join('\n');
    assert.doesNotMatch(tags, /\sonfocus=|\sonerror=|\sautofocus\b/, where + ': no attribute from a name');
  };
  safe(html(sandbox), 'the card');
  assert.ok(html(sandbox).includes('&lt;img src=x onerror=alert(1)&gt;'), 'the name is there, as text');
  click(sandbox, 'ask-delete-browser-workspace', 'bw-a');
  sandbox.render();
  safe(html(sandbox), 'the delete question');
  click(sandbox, 'cancel-browser-workspace-question');

  await sandbox.openBrowserWorkspace('bw-c');
  sandbox.setWorkspaceMenuOpen(true);
  sandbox.askToResetSample();
  safe(sandbox.renderTopPanelHtml(), 'the menu and its question');
  assert.ok(sandbox.renderTopPanelHtml().includes('&lt;b&gt;Sample&lt;/b&gt;'));
});

test('a settings.name with markup in an imported file is text on the card and in the bar', async () => {
  const idb = fakeIndexedDB();
  const { sandbox } = await ready(idb);
  const files = {
    '.archicode.yaml': 'settings:\n  name: ' + JSON.stringify(MARKUP_NAME) + '\n',
    'manifests/app.s1.yaml': SYSTEM('s1', 'S1')
  };
  const bytes = Buffer.from(bundleTextOf(files), 'utf8');
  const file = {
    name: 'picked.yaml',
    size: bytes.length,
    arrayBuffer: async () => Uint8Array.from(bytes).buffer
  };
  await sandbox.importBundleFile(file);
  assert.deepEqual(workspaceNames(idb), [MARKUP_NAME]);
  sandbox.setWorkspaceMenuOpen(true);
  const bar = sandbox.renderTopPanelHtml();
  assert.doesNotMatch(bar, /<img/);
  await sandbox.closeFolder();
  sandbox.render();
  assert.doesNotMatch(html(sandbox), /<img/);
  assert.ok(html(sandbox).includes('&lt;img'));
});

// ---- 360 px ----

test('at 360 px the menu is bounded by the window, the card’s buttons wrap and no new rule is wider than the window', () => {
  const standalone = fs.readFileSync(
    path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'),
    'utf8'
  );
  const css = standalone
    .slice(standalone.indexOf('<style>'), standalone.indexOf('</style>'))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = Array.from(css.matchAll(/([^{}]*\.workspace-menu[^{}]*)\{([^{}]*)\}/g));
  assert.ok(rules.length > 0, 'the menu has rules');
  assert.ok(
    rules.some(([, , body]) => /(?:^|[;\s])(?:max-)?width:[^;]*(?:100vw|100%)/.test(body)),
    'the menu is no wider than the window'
  );
  for (const [selector, , body] of rules)
    for (const width of body.matchAll(/(?:^|[;\s])(?:min-)?width:\s*(\d+(?:\.\d+)?)px/g))
      assert.ok(Number(width[1]) <= 360, selector.trim() + ' is ' + width[1] + 'px wide');
  assert.match(css, /\.landing-actions \{[^}]*flex-wrap: wrap/, 'four buttons wrap on the card');
});
