'use strict';
// Wave 025, run 0192 (W-4), issue #162 proposal 2, TDD-0192: the landing card of the browser workspaces, the notice in the bar and the click handler that drives them.
// The cases here read the drawn card (`#app`'s innerHTML), the configuration it is drawn from (`landingScreenConfig`, CTR-3) or go through the click handler of
// the page, with the data-action names of IMP-5. `browser-workspaces-flows.test.js` has the flows with no card. Written before the code (red): each fails because a
// function, a state variable or a piece of the card is missing from the page.
//
// What this file fixes beyond the TDD (so that the card is written against it): a button that acts on a workspace carries `data-workspace-id` and an `aria-label`
// that names it (`Open “Shop”`, `Rename “Shop”`, `Delete “Shop”`, `Delete “Shop”` again on the confirming button, `Cancel`); the open name field is an `<input>` whose
// `value` is the typed text, with its Create button `data-action="submit-browser-name"` and its Cancel `data-action="cancel-browser-name"`; Escape on the card
// cancels the question or the field; a record that cannot be read (a `workspace:<id>` whose `name` is not a text) is a row that says `could not be read`
// and whose only working button is Delete.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, fakeIndexedDB, makeDirHandle, waitFor } = require('./harness');

const BDB = 'archicode-browser-workspaces';
const FDB = 'archicode-standalone-editor';
const SYSTEM = 'header:\n  kind: archicode.morin.io/system\n  version: "1"\ncontent:\n  id: s1\n  name: S1\n';
const SHOP_FILES = { '.archicode.yaml': '# A workspace.\nsettings:\n  name: Shop\n', 'manifests/app.s1.yaml': SYSTEM };
const THREE_FILES = Object.assign(
  { 'manifests/app.s2.yaml': SYSTEM.replace(/s1/, 's2').replace('S1', 'S2') },
  SHOP_FILES
);

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const encode = (text) => new TextEncoder().encode(text);
const html = (sandbox) => run(sandbox, "document.getElementById('app').innerHTML");
const unescaped = (text) =>
  text
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const cardText = (sandbox) =>
  unescaped(
    html(sandbox)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
  );

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
const workspaceNames = (idb) =>
  Object.values(browserRecords(idb))
    .filter((r) => r.kind === 'workspace')
    .map((r) => r.name)
    .sort();

function fingerprint(idb, name) {
  const db = idb.dump(name);
  if (!db) return 'none';
  const text = JSON.stringify(db, (key, value) =>
    ArrayBuffer.isView(value)
      ? 'bytes:' +
        crypto
          .createHash('sha1')
          .update(Buffer.from(value.buffer, value.byteOffset, value.byteLength))
          .digest('hex')
      : value
  );
  return crypto.createHash('sha1').update(text).digest('hex');
}

function page(idb, options = {}) {
  const sandbox = createApp(Object.assign({ indexedDB: idb, withFile: true }, options));
  sandbox.console.error = () => {};
  if (options.picker) sandbox.window.showDirectoryPicker = async () => undefined;
  return sandbox;
}

/** A page whose store was probed and list read, with the card drawn. */
async function ready(idb, options) {
  const sandbox = page(idb, options);
  await sandbox.probeBrowserStore();
  await sandbox.refreshBrowserWorkspaces();
  sandbox.render();
  return sandbox;
}

const settled = (sandbox) => {
  const state = sandbox.__state();
  if (run(sandbox, 'landingBusy') !== null || run(sandbox, 'browserStoreState') === 'unknown') return false;
  const card = sandbox.landingScreenConfig();
  return !!(state.workspace || state.fatalError || (card && card.kind !== 'busy'));
};
async function load(idb, options) {
  const sandbox = page(idb, options);
  for (const listener of sandbox.__documentListeners.DOMContentLoaded) listener();
  await waitFor(() => settled(sandbox), 'the page to settle');
  return sandbox;
}

/** A click on an element of the card, as the delegated handler of the page gets it. */
function click(sandbox, action, workspace) {
  const attributes = { 'data-action': action };
  if (workspace !== undefined) attributes['data-workspace-id'] = workspace;
  const element = { getAttribute: (name) => (name in attributes ? attributes[name] : null) };
  sandbox.handleAppClick({ target: { closest: () => element, classList: { contains: () => false } }, detail: 1 });
}
const escape = (sandbox) => {
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
};

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

// ---- the card by capability (REQ-4, DEC-4) ----

test('without a picker and with the store ready, the card is first-launch, says nothing of Firefox, Safari or the File System Access API, and offers the browser only', async () => {
  const sandbox = await ready(fakeIndexedDB());
  assert.equal(run(sandbox, 'browserStoreState'), 'ready');
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'first-launch');
  assert.equal(card.title, 'Open a workspace');
  assert.equal(
    card.text,
    'Edit the elements, relationships, views and settings of an ArchiCode workspace. Your workspaces are kept in this browser, on this device.'
  );
  const said = [card.title, card.text, card.note, card.notice].join(' ');
  assert.doesNotMatch(said, /Firefox|Safari/);
  assert.doesNotMatch(said, /File System Access/);
  assert.doesNotMatch(html(sandbox), /Firefox|Safari|File System Access/);
  assert.match(card.note, /Nothing is stored in this browser until you click “Save all changes”\./);
  assert.doesNotMatch(card.note, /written to disk/);
  assert.deepEqual(
    plain(card.actions.map((a) => [a.label, a.action])),
    [
      ['Open the Brightcart sample', 'open-sample'],
      ['New workspace in this browser', 'new-browser-workspace'],
      ['Import a workspace file', 'import-bundle']
    ],
    'the sample, the new workspace and the import (DEC-11 of run 0193), and no way to pick a folder where the browser cannot'
  );
  assert.equal(
    sandbox.isFolderAccessAvailable(),
    false,
    'isFolderAccessAvailable still means folders (server-mode.test.js)'
  );
  assert.equal(sandbox.canKeepWorkspace(), true);
});

test('with a picker, the card offers the sample, the new workspace, the folder and the import, and says both notes', async () => {
  const sandbox = await ready(fakeIndexedDB(), { picker: true });
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'first-launch');
  assert.deepEqual(plain(card.actions.map((a) => [a.label, a.action])), [
    ['Open the Brightcart sample', 'open-sample'],
    ['New workspace in this browser', 'new-browser-workspace'],
    ['Open workspace folder', 'open-folder'],
    ['Import a workspace file', 'import-bundle']
  ]);
  assert.ok(
    card.text.startsWith(
      'Edit the elements, relationships, views and settings of an ArchiCode workspace, straight from its folder.'
    ),
    'the existing text stays'
  );
  assert.match(card.text, /browser/, 'and a second sentence names the browser option');
  assert.match(card.note, /Choose the folder that contains \.archicode\.yaml\./);
  assert.match(card.note, /Nothing is written to disk until you click “Save all changes”\./);
  assert.match(card.note, /Nothing is stored in this browser until you click “Save all changes”\./);
});

test('while the bootstrap probes the store the card is busy, never unsupported', async () => {
  // The busy card is the bootstrap's doing (it sets `landingBusy` before it awaits the probe), not a reading of `browserStoreState`
  // 'unknown': a page that never ran its bootstrap and has no picker stays `unsupported`, as server-mode.test.js pins.
  assert.equal(
    page(fakeIndexedDB()).landingScreenConfig().kind,
    'unsupported',
    'a page with no bootstrap and no picker, as before'
  );
  // the page asks the question once, in the bootstrap, and the answer comes before the card of a page with no picker is final
  const idb = fakeIndexedDB();
  const sandbox = page(idb);
  for (const listener of sandbox.__documentListeners.DOMContentLoaded) listener();
  assert.notEqual(sandbox.landingScreenConfig().kind, 'unsupported', 'not even for the length of the probe');
  await waitFor(() => settled(sandbox), 'the probe');
  assert.equal(sandbox.landingScreenConfig().kind, 'first-launch');
  assert.equal(idb.calls.filter((c) => c.op === 'open' && c.name === BDB).length >= 1, true);
});

test('the unsupported card is for a page with neither a picker nor a store, and says why the store failed', async () => {
  const sandbox = page(fakeIndexedDB({ failOpen: 'SecurityError' }));
  await sandbox.probeBrowserStore();
  assert.equal(typeof plain(run(sandbox, 'browserStoreState')).failed, 'string');
  assert.equal(sandbox.canKeepWorkspace(), false);
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'unsupported');
  assert.match(card.text, /SecurityError/, 'the reason');
  assert.match(card.text, /keep a workspace/, 'what the browser does not allow');
  assert.match(card.text, /archicode editor serve/, 'the way out');
  assert.doesNotMatch(card.text, /Firefox and Safari/);
  sandbox.render();
  assert.match(html(sandbox), /data-landing="unsupported"/);
});

test('a picker-capable page whose store failed still offers its folders and no browser workspace', async () => {
  const sandbox = page(fakeIndexedDB({ failOpen: 'SecurityError' }), { picker: true });
  await sandbox.probeBrowserStore();
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'first-launch');
  assert.deepEqual(plain(card.actions.map((a) => a.action)), ['open-folder']);
  sandbox.render();
  assert.doesNotMatch(html(sandbox), /new-browser-workspace|In this browser/);
});

test('a served page is unchanged: no browser list, no browser action', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const fetch = async () => ({ ok: false, status: 503, headers: { get: () => null }, text: async () => 'down' });
  const sandbox = page(idb, { serverToken: 't', fetch });
  assert.equal(sandbox.isFolderAccessAvailable(), true);
  for (const listener of sandbox.__documentListeners.DOMContentLoaded) listener();
  await waitFor(() => run(sandbox, 'landingBusy') === null, 'the served page to give up');
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'error');
  assert.equal(card.browserRows, undefined);
  sandbox.render();
  assert.doesNotMatch(html(sandbox), /In this browser|new-browser-workspace/);
});

// ---- the rows (IF-3) ----

test('the list In this browser has a row per workspace: its name, its files, when it changed, where it is kept, and three buttons that each name it', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop', files: THREE_FILES },
    { id: 'bw-b', name: 'Other', files: { '.archicode.yaml': 'settings: {}\n' } }
  ]);
  const sandbox = await ready(idb);
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'first-launch');
  const rows = plain(card.browserRows);
  assert.deepEqual(rows.map((r) => r.title).sort(), ['Other', 'Shop']);
  const shop = rows.find((r) => r.id === 'bw-a');
  assert.equal(shop.files, 3);
  assert.equal(shop.exported, 'never');
  assert.equal(typeof shop.changed, 'string');
  assert.equal(rows.find((r) => r.id === 'bw-b').files, 1);

  const markup = html(sandbox);
  assert.match(markup, /<h2[^>]*>In this browser<\/h2>/);
  const text = cardText(sandbox);
  assert.match(text, /Shop/);
  assert.match(text, /3 files/);
  assert.equal((text.match(/Kept in this browser/g) || []).length, 2, 'said for each row');
  assert.equal((text.match(/Last exported: never/g) || []).length, 2);
  for (const [id, name] of [
    ['bw-a', 'Shop'],
    ['bw-b', 'Other']
  ]) {
    for (const [action, verb] of [
      ['open-browser-workspace', 'Open'],
      ['rename-browser-workspace', 'Rename'],
      ['ask-delete-browser-workspace', 'Delete']
    ]) {
      const tag = button(markup, action, id);
      assert.ok(tag, verb + ' ' + name + ' is a button');
      assert.equal(label(tag), verb + ' “' + name + '”');
    }
  }
  assert.ok(button(markup, 'new-browser-workspace'), 'and the action above the list');
});

test('the actions of the list are routed by the click handler to the flows', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Other' }
  ]);
  const sandbox = await ready(idb);
  click(sandbox, 'new-browser-workspace');
  await waitFor(() => run(sandbox, 'landingNameDraft') !== null, 'the field to open');
  assert.equal(plain(run(sandbox, 'landingNameDraft')).for, 'new');
  click(sandbox, 'cancel-browser-name');
  assert.equal(run(sandbox, 'landingNameDraft'), null);

  click(sandbox, 'rename-browser-workspace', 'bw-b');
  assert.equal(plain(run(sandbox, 'landingNameDraft')).for, 'bw-b');
  sandbox.setBrowserNameDraft('Renamed');
  click(sandbox, 'submit-browser-name');
  await waitFor(() => workspaceNames(idb).includes('Renamed'), 'the rename');
  assert.deepEqual(workspaceNames(idb), ['Renamed', 'Shop']);

  click(sandbox, 'ask-delete-browser-workspace', 'bw-a');
  assert.equal(run(sandbox, 'landingPendingDelete'), 'bw-a');
  click(sandbox, 'cancel-browser-workspace-question');
  assert.equal(run(sandbox, 'landingPendingDelete'), null);

  click(sandbox, 'open-browser-workspace', 'bw-a');
  await waitFor(() => sandbox.__state().workspace, 'the workspace to open');
  assert.equal(sandbox.__state().folder.browserWorkspace, 'bw-a');
});

test('a new workspace is created from the field by its Create button', async () => {
  const idb = fakeIndexedDB();
  const sandbox = await ready(idb);
  click(sandbox, 'new-browser-workspace');
  await waitFor(() => run(sandbox, 'landingNameDraft') !== null, 'the field to open');
  sandbox.setBrowserNameDraft('Made by a click');
  click(sandbox, 'submit-browser-name');
  await waitFor(() => sandbox.__state().workspace, 'the workspace to open');
  assert.deepEqual(workspaceNames(idb), ['Made by a click']);
});

// ---- the name field ----

test('the name field is an input with the typed text, a Create and a Cancel, and keeps the text and the sentence across a redraw', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await ready(idb);
  await sandbox.newBrowserWorkspace();
  sandbox.render();
  let markup = html(sandbox);
  assert.match(markup, /<input\b[^>]*value="Untitled workspace"/, 'the default name');
  assert.ok(button(markup, 'submit-browser-name'));
  assert.ok(button(markup, 'cancel-browser-name'));

  sandbox.setBrowserNameDraft('  shop');
  await sandbox.submitBrowserNameDraft();
  const problem = plain(run(sandbox, 'landingNameDraft')).problem;
  assert.equal(typeof problem, 'string');
  for (let i = 0; i < 2; i++) {
    sandbox.requestRedraw();
    sandbox.render();
    markup = html(sandbox);
    assert.match(markup, /<input\b[^>]*value=" {2}shop"/, 'the typed text is kept');
    assert.ok(unescaped(markup).includes(problem), 'and the sentence is under the field');
  }
  click(sandbox, 'cancel-browser-name');
  sandbox.render();
  assert.doesNotMatch(html(sandbox), /<input\b/, 'Cancel closes the field');
  assert.equal(workspaceNames(idb).join(), 'Shop');
});

test('Rename shows the name in the field of its row, and only that row', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Other' }
  ]);
  const sandbox = await ready(idb);
  sandbox.renameBrowserWorkspaceRow('bw-b');
  sandbox.render();
  const markup = html(sandbox);
  assert.equal((markup.match(/<input\b/g) || []).length, 1);
  assert.match(markup, /<input\b[^>]*value="Other"/);
  assert.ok(button(markup, 'open-browser-workspace', 'bw-a'), 'the other row is as it was');
});

// ---- the delete question (DEC-7) ----

test('the delete question names the workspace, its files and that nothing is undone or touched on disk; the focus is on Cancel', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop', files: THREE_FILES }]);
  const sandbox = await ready(idb);
  click(sandbox, 'ask-delete-browser-workspace', 'bw-a');
  sandbox.render();
  const markup = html(sandbox);
  const text = cardText(sandbox);
  assert.match(text, /“Shop”/);
  assert.match(text, /3 files/);
  assert.match(text, /cannot be undone/);
  assert.match(text, /disk/);
  const confirm = button(markup, 'delete-browser-workspace', 'bw-a');
  assert.ok(confirm, 'a button that deletes');
  assert.equal(label(confirm), 'Delete “Shop”');
  assert.doesNotMatch(confirm, /autofocus|id="landing-primary"|btn-primary/, 'Enter does not delete');
  assert.ok(button(markup, 'cancel-browser-workspace-question'));
  assert.match(run(sandbox, 'landingFocusSelector'), /cancel-browser-workspace-question/, 'the focus goes to Cancel');
  assert.equal(button(markup, 'ask-delete-browser-workspace', 'bw-a'), null, 'the row has turned into the question');
});

test('Cancel and Escape change nothing; Delete removes the workspace and the focus goes on', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Other' }
  ]);
  const sandbox = await ready(idb);
  const before = fingerprint(idb, BDB);

  click(sandbox, 'ask-delete-browser-workspace', 'bw-a');
  click(sandbox, 'cancel-browser-workspace-question');
  assert.equal(run(sandbox, 'landingPendingDelete'), null);
  assert.equal(fingerprint(idb, BDB), before);
  sandbox.render();
  assert.ok(button(html(sandbox), 'ask-delete-browser-workspace', 'bw-a'), 'the row is back');

  click(sandbox, 'ask-delete-browser-workspace', 'bw-a');
  const event = escape(sandbox);
  assert.equal(run(sandbox, 'landingPendingDelete'), null, 'Escape cancels');
  assert.equal(event.defaultPrevented, true);
  assert.equal(fingerprint(idb, BDB), before);

  click(sandbox, 'ask-delete-browser-workspace', 'bw-a');
  click(sandbox, 'delete-browser-workspace', 'bw-a');
  await waitFor(() => workspaceNames(idb).length === 1, 'the delete');
  assert.deepEqual(workspaceNames(idb), ['Other']);
  await waitFor(() => run(sandbox, 'browserWorkspaces.length') === 1, 'the list');
  sandbox.render();
  assert.equal(button(html(sandbox), 'open-browser-workspace', 'bw-a'), null);
  assert.ok(button(html(sandbox), 'open-browser-workspace', 'bw-b'));
  assert.match(
    String(run(sandbox, 'landingFocusSelector')),
    /open-browser-workspace|new-browser-workspace/,
    'the next row or New workspace'
  );
});

test('Escape on a card with no question or field does nothing', async () => {
  const sandbox = await ready(fakeIndexedDB());
  const event = escape(sandbox);
  assert.equal(event.defaultPrevented, false);
});

test('the question names the row that was clicked when two names differ only by case', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'shop' }
  ]); // seeded: the store would not have made them
  const sandbox = await ready(idb);
  click(sandbox, 'ask-delete-browser-workspace', 'bw-b');
  sandbox.render();
  const markup = html(sandbox);
  assert.ok(cardText(sandbox).includes('“shop”'));
  assert.ok(!cardText(sandbox).includes('“Shop”'), 'the other one is not named in the question');
  const confirm = button(markup, 'delete-browser-workspace');
  assert.ok(confirm.includes('data-workspace-id="bw-b"'), 'and the button deletes that one');
  assert.equal(label(confirm), 'Delete “shop”');
});

// ---- escaping (Security and Privacy) ----

test('a workspace name is text in the list, the question and every attribute', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: '<img src=x onerror=alert(1)>' },
    { id: 'bw-b', name: 'He said "hi" & <b>left</b>' }
  ]);
  const sandbox = await ready(idb);
  const check = () => {
    const markup = html(sandbox);
    assert.doesNotMatch(markup, /<img\b/, 'no element made of a name');
    assert.doesNotMatch(markup, /<b>left/);
    assert.doesNotMatch(markup, /aria-label="[^"]*"[^">]*"[^>]*>/, 'no quote of a name closes an attribute');
    assert.ok(markup.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(markup.includes('He said &quot;hi&quot; &amp; &lt;b&gt;left&lt;/b&gt;'));
    assert.ok(cardText(sandbox).includes('<img src=x onerror=alert(1)>'), 'and it reads as the name');
  };
  check();
  click(sandbox, 'ask-delete-browser-workspace', 'bw-a');
  sandbox.render();
  check();
  click(sandbox, 'cancel-browser-workspace-question');
  sandbox.renameBrowserWorkspaceRow('bw-b');
  sandbox.render();
  assert.match(html(sandbox), /<input\b[^>]*value="He said &quot;hi&quot; &amp; &lt;b&gt;left&lt;\/b&gt;"/);
});

// ---- a record that cannot be read (IF-6) ----

test('a record that cannot be read is a row that says so, and only Delete works on it', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-bad', name: 42 } // not a text: the record does not parse
  ]);
  const sandbox = await ready(idb);
  sandbox.render();
  const markup = html(sandbox);
  assert.match(cardText(sandbox), /could not be read/);
  assert.equal(button(markup, 'open-browser-workspace', 'bw-bad'), null);
  assert.equal(button(markup, 'rename-browser-workspace', 'bw-bad'), null);
  assert.ok(button(markup, 'ask-delete-browser-workspace', 'bw-bad'));
  assert.ok(button(markup, 'open-browser-workspace', 'bw-a'), 'the others are fine');

  click(sandbox, 'ask-delete-browser-workspace', 'bw-bad');
  click(sandbox, 'delete-browser-workspace', 'bw-bad');
  await waitFor(() => !('workspace:bw-bad' in browserRecords(idb)), 'the delete');
  assert.deepEqual(
    Object.keys(browserRecords(idb)).filter((k) => k.includes('bw-bad')),
    [],
    'the record and its files are gone'
  );
  assert.ok(browserRecords(idb)['workspace:bw-a'], 'the readable one is not touched');
});

// ---- the bar and the help ----

test('while a browser workspace is open the bar says it is kept in this browser and offers Close workspace', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await ready(idb);
  await sandbox.openBrowserWorkspace('bw-a');
  const bar = unescaped(sandbox.renderTopPanelHtml());
  assert.match(bar, />In this browser</);
  assert.ok(
    bar.includes("This workspace is kept in this browser on this device. Clearing the site's data removes it.")
  );
  assert.doesNotMatch(bar, /short of space/, 'until the browser says it may remove it');
  const close = button(bar, 'close-folder');
  assert.ok(close);
  assert.match(bar, /data-action="close-folder"[^>]*>Close workspace</);
  assert.doesNotMatch(bar, />Close folder</);
  assert.ok(button(bar, 'close-folder').includes('title="'), 'with a title that says the data stays');

  vm.runInContext('browserStoragePersisted = false', sandbox);
  assert.ok(
    unescaped(sandbox.renderTopPanelHtml()).includes('The browser may remove it when the device is short of space.')
  );
});

test('a folder workspace has neither the notice nor the new label', async () => {
  const sandbox = page(fakeIndexedDB(), { picker: true });
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-landing-')), 'disk');
  fs.mkdirSync(path.join(dir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifests', 'app.s1.yaml'), SYSTEM);
  fs.writeFileSync(path.join(dir, '.archicode.yaml'), 'settings:\n  name: Disk\n');
  const handle = makeDirHandle(dir);
  sandbox.__state().folder = { handle, name: 'disk', id: null };
  sandbox.__state().permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  const bar = sandbox.renderTopPanelHtml();
  assert.doesNotMatch(bar, /In this browser/);
  assert.match(bar, />Close folder</);
});

// ---- the error card of a browser workspace (IF-6) ----

test('the error card of a browser workspace goes back to the list, not to the folder picker', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop', files: { 'manifests/app.s1.yaml': SYSTEM } },
    { id: 'bw-b', name: 'Other' }
  ]);
  const sandbox = await ready(idb, { picker: true });
  await sandbox.openBrowserWorkspace('bw-a');
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'error');
  const actions = plain(card.actions.map((a) => [a.label, a.action]));
  assert.ok(actions.some(([name, action]) => name === 'Back to the list' && action === 'show-folders'));
  assert.ok(
    !actions.some(([, action]) => action === 'open-folder'),
    'no Choose another folder for a workspace that is not a folder'
  );
  assert.ok(actions.some(([name, action]) => name === 'Try again' && action === 'retry-folder'));
  click(sandbox, 'show-folders');
  await waitFor(() => sandbox.__state().folder === null, 'the list');
  assert.equal(sandbox.landingScreenConfig().kind, 'first-launch');
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 2);
});

test('the reopen card for a folder that needs a click lists the browser workspaces too', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop', openedAt: 1000 }], { id: 'bw-a', openedAt: 1000 });
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-landing-')), 'disk');
  fs.mkdirSync(dir, { recursive: true });
  const handle = Object.assign(makeDirHandle(dir), {
    queryPermission: async () => 'prompt',
    requestPermission: async () => 'prompt'
  });
  idb.seed(FDB, 1, {
    handles: {
      workspace: { handle, id: 'f1' },
      'folder:f1': { kind: 'folder', id: 'f1', handle, name: 'Disk', openedAt: Date.now() }
    }
  });
  const sandbox = await load(idb, { picker: true });
  const card = sandbox.landingScreenConfig();
  assert.equal(card.kind, 'reopen', 'the folder is the most recent, and needs a click');
  assert.equal(sandbox.__state().workspace, null, 'the browser workspace is not tried instead');
  assert.deepEqual(plain(card.browserRows.map((r) => r.title)), ['Shop']);
});

// ---- 360 px ----

test('at 360 px the rows reuse the wrapping rows of the folders and the card stays inside the window', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'A workspace with a rather long name that has to wrap in a narrow card' }]);
  const sandbox = await ready(idb);
  const markup = html(sandbox);
  assert.match(markup, /<li class="landing-folder\b/, 'a row is a landing-folder');
  const standalone = fs.readFileSync(
    path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'),
    'utf8'
  );
  const css = standalone
    .slice(standalone.indexOf('<style>'), standalone.indexOf('</style>'))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.landing-folder \{[^}]*flex-wrap: wrap/, 'the row wraps');
  assert.match(css, /\.landing-card \{[^}]*width: 100%/);
  assert.match(css, /\.landing-folder-list \{[^}]*overflow-y: auto/);
  // no rule of the card is wider than the window
  for (const rule of css.matchAll(/([^{}]*\.landing[^{}]*)\{([^{}]*)\}/g)) {
    for (const width of rule[2].matchAll(/(?:^|[;\s])(?:min-)?width:\s*(\d+(?:\.\d+)?)px/g))
      assert.ok(Number(width[1]) <= 360, rule[1].trim() + ' is ' + width[1] + 'px wide');
  }
  assert.match(css, /\.landing-browser|\.landing-folder/, 'the rows have rules');
  // the field is as wide as its row and no wider
  const fieldRules = css.match(/[^{}]*landing[^{}]*input[^{}]*\{[^{}]*\}/g) || [];
  assert.ok(
    fieldRules.some((rule) => /max-width:\s*100%|min-width:\s*0|flex:\s*1/.test(rule)),
    'the name field is bounded by its row'
  );
});
