'use strict';
// Two losses of the line-preserving save (wave 017, run 0123; issue #119, findings F2b and F2c of run 0104).
//   1. A file that starts with a UTF-8 byte-order mark loses it when the editor saves it: a browser never gives the mark to the page (`File.text()` and the decoder of a
//      response drop it), so the page reads the first three bytes, holds the text without the mark and writes the mark back first.
//   2. A comment after the last line of a block that is moved goes with the block when it is indented as the keys of the block (or as the item itself when no sibling follows),
//      and stays when it introduces the next element (a heuristic of indentation, its limits are pinned below). The command line reads a BOM in a manifest and in .archicode.yaml
//      (checked by hand on the jar: it gives the same graph), and never writes a manifest, so there is no case shared with it.
// The real page, the real kernel, in-memory folders (`mem-folder.js` hands a file that starts with the mark as a browser does: `text()` without it, the bytes with it).
// Everything is invented: an orchard, a market, a barn.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const MARK = '﻿';

const ORCHARD = [
  '# the orchard',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "orchard"',
  '  name: "Orchard"',
  '  elements:',
  '    # the press comes first',
  '    - kind: container',
  '      id: "press"',
  '      name: "Press"',
  '      # about the press, after its last line',
  '    # the cellar is on its own',
  '    - kind: container',
  '      id: "cellar"',
  '      name: "Cellar"',
  '# end of the orchard',
  ''
].join('\n');
/** A solution that holds two systems: a system can leave it for the top level (its block becomes a manifest of its own). */
const SOLUTION = ORCHARD.replace('archicode.morin.io/system', 'archicode.morin.io/solution').replace(
  /kind: container/g,
  'kind: system'
);
const MARKET = [
  '# the market',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "market"',
  '  name: "Market"',
  '  elements:',
  '    - kind: container',
  '      id: "stall"',
  '      name: "Stall"',
  '# end of the market',
  ''
].join('\n');
const WORKSPACE = 'settings:\n  manifests:\n    paths:\n      - manifests\n';

async function open(manifests, workspace) {
  const files = Object.assign(
    { '.archicode.yaml': workspace === undefined ? WORKSPACE : workspace },
    Object.fromEntries(Object.entries(manifests).map(([name, body]) => [`manifests/${name}`, body]))
  );
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state, mem, files };
}
const onDisk = (page, name) =>
  page.mem.files.get(name.includes('/') || name === '.archicode.yaml' ? name : 'manifests/' + name).text;
const move = (page, reference, parent) => page.sandbox.commitMoveElement(reference, 'application', parent);
const rename = (page, reference, name) =>
  page.sandbox.commitElementEdit(reference, (node) => {
    node.name = name;
    return {};
  });

// ---- 1. The byte-order mark ----

test('a manifest that starts with a byte-order mark is saved with it: only the line that changed differs, the mark is the first character of the file', async () => {
  const page = await open({ 'app.orchard.yaml': MARK + ORCHARD, 'app.market.yaml': MARKET });
  const file = page.state.manifestFiles.find((f) => f.relPath === 'manifests/app.orchard.yaml');
  assert.equal(file.bom, true, 'the page knows the file had the mark');
  assert.equal(file.rawText.charCodeAt(0) === 0xfeff, false, 'and holds its text without it, as the browser gave it');
  assert.equal(page.state.manifestFiles.find((f) => f.relPath === 'manifests/app.market.yaml').bom, false);
  rename(page, 'orchard', 'Orchard of Bees');
  assert.equal(file.dirty, true);
  await page.sandbox.saveAllChanges();
  assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
  assert.equal(
    onDisk(page, 'app.orchard.yaml'),
    MARK + ORCHARD.replace('  name: "Orchard"', '  name: "Orchard of Bees"')
  );
  assert.equal(file.dirty, false);
  assert.equal(file.rawText.charCodeAt(0) === 0xfeff, false, 'what the page holds is still without the mark');
  // a second edit and save: one mark, not two
  rename(page, 'orchard', 'Orchard of Wasps');
  await page.sandbox.saveAllChanges();
  assert.equal(
    onDisk(page, 'app.orchard.yaml'),
    MARK + ORCHARD.replace('  name: "Orchard"', '  name: "Orchard of Wasps"')
  );
  assert.equal(onDisk(page, 'app.orchard.yaml').indexOf(MARK, 1), -1);
  // a file with no mark is not given one
  rename(page, 'market', 'Market Hall');
  await page.sandbox.saveAllChanges();
  assert.equal(onDisk(page, 'app.market.yaml'), MARKET.replace('  name: "Market"', '  name: "Market Hall"'));
  assert.equal(onDisk(page, 'app.market.yaml').charCodeAt(0), '#'.charCodeAt(0));
});

test('the text editor of Files, a reload of the file and an unrelated save keep the mark too; a file the editor creates has none', async () => {
  const page = await open({ 'app.orchard.yaml': MARK + SOLUTION, 'app.market.yaml': MARKET });
  // the raw YAML edit of Files (the text the author types has no mark: the mark is the file's)
  page.sandbox.commitFileEdit('manifests/app.orchard.yaml', SOLUTION.replace('"Cellar"', '"Wine Cellar"'));
  assert.equal(
    page.state.manifestFiles.find((f) => f.relPath === 'manifests/app.orchard.yaml').bom,
    true,
    'the edit of the text keeps what is known of the file'
  );
  await page.sandbox.saveAllChanges();
  assert.equal(onDisk(page, 'app.orchard.yaml'), MARK + SOLUTION.replace('"Cellar"', '"Wine Cellar"'));
  // another session changes the file on disk, with the mark gone: the reload reads that
  page.mem.put('manifests/app.orchard.yaml', SOLUTION);
  await page.sandbox.reloadManifestFile('manifests/app.orchard.yaml');
  assert.equal(
    page.state.manifestFiles.find((f) => f.relPath === 'manifests/app.orchard.yaml').bom,
    false,
    'a reload reads the file as it is now'
  );
  page.mem.put('manifests/app.orchard.yaml', MARK + SOLUTION);
  await page.sandbox.reloadManifestFile('manifests/app.orchard.yaml');
  assert.equal(page.state.manifestFiles.find((f) => f.relPath === 'manifests/app.orchard.yaml').bom, true);
  rename(page, 'orchard.press', 'Cider Press');
  await page.sandbox.saveAllChanges();
  assert.equal(
    onDisk(page, 'app.orchard.yaml'),
    MARK + SOLUTION.replace('      name: "Press"', '      name: "Cider Press"')
  );
  // an element moved to the top level has a manifest of its own, written without a mark (the file it left keeps its own)
  assert.equal(move(page, 'orchard.cellar', ' top level').ok, true);
  await page.sandbox.saveAllChanges();
  assert.equal(onDisk(page, 'app.cellar.yaml').charCodeAt(0), 'h'.charCodeAt(0), 'a new file has no mark');
  assert.equal(onDisk(page, 'app.orchard.yaml').charCodeAt(0), 0xfeff);
  assert.equal(onDisk(page, 'app.orchard.yaml').indexOf(MARK, 1), -1);
});

test('.archicode.yaml with a byte-order mark is saved with it, and without one it is not given one', async () => {
  const page = await open({ 'app.orchard.yaml': ORCHARD }, MARK + '# the workspace\n' + WORKSPACE);
  assert.equal(page.state.workspace.bom, true);
  page.sandbox.commitSettingsEdit((live) => {
    live.name = 'Orchard';
  });
  await page.sandbox.saveAllChanges();
  assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
  const saved = onDisk(page, '.archicode.yaml');
  assert.equal(saved.charCodeAt(0), 0xfeff);
  assert.equal(saved.indexOf(MARK, 1), -1);
  assert.ok(saved.slice(1).startsWith('# the workspace\n'), "the comment of the file is the author's, after the mark");
  assert.ok(saved.includes('name: Orchard') || saved.includes('name: "Orchard"'));
  const plainPage = await open({ 'app.orchard.yaml': ORCHARD });
  assert.equal(plainPage.state.workspace.bom, false);
  plainPage.sandbox.commitSettingsEdit((live) => {
    live.name = 'Orchard';
  });
  await plainPage.sandbox.saveAllChanges();
  assert.notEqual(onDisk(plainPage, '.archicode.yaml').charCodeAt(0), 0xfeff);
});

test('a block moved to another file keeps the mark of the file it leaves and of the file it joins, each its own', async () => {
  for (const [orchardMark, marketMark] of [
    [MARK, ''],
    ['', MARK],
    [MARK, MARK]
  ]) {
    const page = await open({ 'app.orchard.yaml': orchardMark + ORCHARD, 'app.market.yaml': marketMark + MARKET });
    assert.equal(move(page, 'orchard.press', 'market').ok, true);
    await page.sandbox.saveAllChanges();
    assert.equal(
      onDisk(page, 'app.orchard.yaml').startsWith(orchardMark + '# the orchard\n'),
      true,
      `orchard ${orchardMark === MARK ? 'with' : 'without'} mark`
    );
    assert.equal(
      onDisk(page, 'app.market.yaml').startsWith(marketMark + '# the market\n'),
      true,
      `market ${marketMark === MARK ? 'with' : 'without'} mark`
    );
    assert.equal(onDisk(page, 'app.orchard.yaml').indexOf(MARK, 1), -1);
    assert.equal(onDisk(page, 'app.market.yaml').indexOf(MARK, 1), -1);
    const again = createApp({});
    await again.loadWorkspace(page.mem.handle);
    assert.equal(again.__state().fatalError, null);
    assert.ok(again.__state().index.application.has('market.press'));
  }
});

test('the functions of the text keep a mark they are given (a caller that holds the text with it gets it back)', () => {
  const sandbox = createApp({});
  const value = {
    header: { kind: 'archicode.morin.io/system', version: '1' },
    content: { id: 'orchard', name: 'Orchard 2', elements: [{ kind: 'container', id: 'press', name: 'Press' }] }
  };
  const patched = run(sandbox, 'patchYamlText')(
    MARK +
      'header:\n  kind: archicode.morin.io/system\n  version: "1"\ncontent:\n  id: orchard\n  name: Orchard\n  elements:\n    - kind: container\n      id: press\n      name: Press\n',
    value
  );
  assert.equal(patched.charCodeAt(0), 0xfeff);
  assert.equal(patched.indexOf(MARK, 1), -1);
  assert.ok(patched.includes('  name: Orchard 2\n'));
  const noMark = run(sandbox, 'patchYamlText')(
    'header:\n  kind: archicode.morin.io/system\n  version: "1"\ncontent:\n  id: orchard\n  name: Orchard\n',
    { header: value.header, content: { id: 'orchard', name: 'Orchard 2' } }
  );
  assert.equal(noMark.charCodeAt(0), 'h'.charCodeAt(0));
});

/** A fake of the routes of `archicode editor serve` that keeps the bytes of its files, as the real server does. */
function bytesServer(files) {
  const store = new Map(Object.entries(files).map(([name, body]) => [name, Buffer.from(body, 'utf8')]));
  const TOKEN = 'a-token';
  const answer = (status, body, extra) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (extra && extra[name]) || null },
    // what a browser's Response does: `text()` decodes UTF-8 and drops the mark
    async text() {
      return Buffer.isBuffer(body)
        ? new TextDecoder().decode(body)
        : typeof body === 'string'
          ? body
          : JSON.stringify(body);
    },
    async arrayBuffer() {
      const bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
    async json() {
      return body;
    }
  });
  const fetch = async (url, init) => {
    const [route, query] = url.replace('/api/fs/', '').split('?');
    const target = new URLSearchParams(query || '').get('path') || '';
    if (init.headers['X-ArchiCode-Token'] !== TOKEN) return answer(401, 'no');
    if (route === 'info') return answer(200, { folder: 'architecture' });
    if (route === 'list') {
      const prefix = target === '' ? '' : target + '/';
      const names = new Map();
      for (const key of store.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        names.set(rest.split('/')[0], rest.includes('/') ? 'directory' : 'file');
      }
      return answer(
        200,
        Array.from(names, ([name, kind]) => ({ name, kind }))
      );
    }
    if (init.method === 'GET')
      return store.has(target)
        ? answer(200, store.get(target), { 'X-ArchiCode-Modified': '5000' })
        : answer(404, 'not found');
    if (init.method === 'PUT') {
      store.set(target, Buffer.from(await init.body.arrayBuffer()));
      return answer(200, 'ok');
    }
    return answer(405, 'no');
  };
  return { store, fetch, TOKEN };
}

test('served by archicode editor serve: the mark of a file is read from its bytes and written back to the server', async () => {
  const server = bytesServer({
    '.archicode.yaml': WORKSPACE,
    'manifests/app.orchard.yaml': MARK + ORCHARD,
    'manifests/app.market.yaml': MARKET
  });
  const sandbox = createApp({ serverToken: server.TOKEN, fetch: server.fetch });
  await sandbox.openServedFolder();
  await sandbox.loadViewpointKernel();
  const state = sandbox.__state();
  assert.equal(state.fatalError, null);
  assert.equal(state.manifestFiles.find((f) => f.relPath === 'manifests/app.orchard.yaml').bom, true);
  assert.equal(state.manifestFiles.find((f) => f.relPath === 'manifests/app.market.yaml').bom, false);
  rename({ sandbox }, 'orchard', 'Orchard of Bees');
  rename({ sandbox }, 'market', 'Market Hall');
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus').state, 'success');
  const orchard = server.store.get('manifests/app.orchard.yaml');
  assert.deepEqual(
    Array.from(orchard.subarray(0, 3)),
    [0xef, 0xbb, 0xbf],
    'the three bytes of the mark are the first of the file on the server'
  );
  assert.equal(orchard.toString('utf8'), MARK + ORCHARD.replace('  name: "Orchard"', '  name: "Orchard of Bees"'));
  assert.equal(
    server.store.get('manifests/app.market.yaml').toString('utf8'),
    MARKET.replace('  name: "Market"', '  name: "Market Hall"')
  );
});

// ---- 2. A comment after the last line of a block that moves ----

const lines = (...rows) => rows.join('\n');

/** The model of a text for the moves: `{ header, content }` and the path of a child of the content, as the page gives them. */
function parts(sandbox, text) {
  const parsed = run(sandbox, 'parseManifestText')(text);
  return { header: parsed.header, content: parsed.content };
}

test('to another file: the comment indented as the keys of the block goes with it, the introduction of the next element stays', async () => {
  const page = await open({ 'app.orchard.yaml': ORCHARD, 'app.market.yaml': MARKET });
  assert.equal(move(page, 'orchard.press', 'market').ok, true);
  await page.sandbox.saveAllChanges();
  assert.equal(
    onDisk(page, 'app.orchard.yaml'),
    lines(
      '# the orchard',
      'header:',
      '  kind: "archicode.morin.io/system"',
      '  version: "1"',
      '',
      'content:',
      '  id: "orchard"',
      '  name: "Orchard"',
      '  elements:',
      '    # the cellar is on its own',
      '    - kind: container',
      '      id: "cellar"',
      '      name: "Cellar"',
      '# end of the orchard',
      ''
    )
  );
  assert.equal(
    onDisk(page, 'app.market.yaml'),
    lines(
      '# the market',
      'header:',
      '  kind: "archicode.morin.io/system"',
      '  version: "1"',
      '',
      'content:',
      '  id: "market"',
      '  name: "Market"',
      '  elements:',
      '    - kind: container',
      '      id: "stall"',
      '      name: "Stall"',
      '    # the press comes first',
      '    - kind: container',
      '      id: "press"',
      '      name: "Press"',
      '      # about the press, after its last line',
      '# end of the market',
      ''
    )
  );
});

test('the rule, case by case (a block that moves to another file): where a comment after its last line goes', async () => {
  const cases = [
    // [name, the lines after `name: "Press"`, the lines that go with the block, the lines that stay in the first file]
    ['deeper than the item, as the keys are', ['      # keys'], ['      # keys'], []],
    [
      'deeper, with a blank line before it: the blank line goes with it',
      ['', '      # keys'],
      ['', '      # keys'],
      []
    ],
    ['several deeper comments in a row', ['      # one', '      # two'], ['      # one', '      # two'], []],
    [
      'deeper, then the introduction of the next element: only the deeper ones go',
      ['      # keys', '    # intro'],
      ['      # keys'],
      ['    # intro']
    ],
    ['at the column of the item, above a sibling: it introduces the sibling', ['    # intro'], [], ['    # intro']],
    [
      'the introduction first, a deeper comment after it: the deeper one is no longer in reach, both stay',
      ['    # intro', '      # deeper'],
      [],
      ['    # intro', '      # deeper']
    ],
    ['shallower than the item', ['  # shallower'], [], ['  # shallower']],
    [
      'a blank line, then a comment at the column of the item above a sibling: stays',
      ['', '    # intro'],
      [],
      ['', '    # intro']
    ],
    ['a blank line after the deeper comment is not carried', ['      # keys', ''], ['      # keys'], ['']]
  ];
  for (const [name, after, goes, stays] of cases) {
    const text = lines(
      '# the orchard',
      'header:',
      '  kind: "archicode.morin.io/system"',
      '  version: "1"',
      '',
      'content:',
      '  id: "orchard"',
      '  name: "Orchard"',
      '  elements:',
      '    - kind: container',
      '      id: "press"',
      '      name: "Press"',
      ...after,
      '    - kind: container',
      '      id: "cellar"',
      '      name: "Cellar"',
      '# end of the orchard',
      ''
    );
    const page = await open({ 'app.orchard.yaml': text, 'app.market.yaml': MARKET });
    assert.equal(move(page, 'orchard.press', 'market').ok, true, name);
    await page.sandbox.saveAllChanges();
    const left = onDisk(page, 'app.orchard.yaml');
    const joined = onDisk(page, 'app.market.yaml');
    assert.equal(
      left,
      lines(
        '# the orchard',
        'header:',
        '  kind: "archicode.morin.io/system"',
        '  version: "1"',
        '',
        'content:',
        '  id: "orchard"',
        '  name: "Orchard"',
        '  elements:',
        ...stays,
        '    - kind: container',
        '      id: "cellar"',
        '      name: "Cellar"',
        '# end of the orchard',
        ''
      ),
      name + ': the file it left'
    );
    assert.equal(
      joined,
      lines(
        '# the market',
        'header:',
        '  kind: "archicode.morin.io/system"',
        '  version: "1"',
        '',
        'content:',
        '  id: "market"',
        '  name: "Market"',
        '  elements:',
        '    - kind: container',
        '      id: "stall"',
        '      name: "Stall"',
        '    - kind: container',
        '      id: "press"',
        '      name: "Press"',
        ...goes,
        '# end of the market',
        ''
      ),
      name + ': the file it joined'
    );
  }
});

test('the last block of its list: a comment at the column of the item has nothing to introduce and goes with the block; one shallower stays', async () => {
  const cellar = (after) =>
    lines(
      '# the orchard',
      'header:',
      '  kind: "archicode.morin.io/system"',
      '  version: "1"',
      '',
      'content:',
      '  id: "orchard"',
      '  name: "Orchard"',
      '  elements:',
      '    - kind: container',
      '      id: "press"',
      '      name: "Press"',
      '    - kind: container',
      '      id: "cellar"',
      '      name: "Cellar"',
      ...after,
      '# end of the orchard',
      ''
    );
  const withMarket = (goes) =>
    lines(
      '# the market',
      'header:',
      '  kind: "archicode.morin.io/system"',
      '  version: "1"',
      '',
      'content:',
      '  id: "market"',
      '  name: "Market"',
      '  elements:',
      '    - kind: container',
      '      id: "stall"',
      '      name: "Stall"',
      '    - kind: container',
      '      id: "cellar"',
      '      name: "Cellar"',
      ...goes,
      '# end of the market',
      ''
    );
  for (const [name, after, goes, stays] of [
    ['at the column of the item', ['    # end of the containers'], ['    # end of the containers'], []],
    ['deeper', ['      # keys'], ['      # keys'], []],
    ["shallower (the file's own last comment)", ['  # about the system'], [], ['  # about the system']]
  ]) {
    const page = await open({ 'app.orchard.yaml': cellar(after), 'app.market.yaml': MARKET });
    assert.equal(move(page, 'orchard.cellar', 'market').ok, true, name);
    await page.sandbox.saveAllChanges();
    assert.equal(onDisk(page, 'app.market.yaml'), withMarket(goes), name);
    assert.equal(
      onDisk(page, 'app.orchard.yaml'),
      lines(
        '# the orchard',
        'header:',
        '  kind: "archicode.morin.io/system"',
        '  version: "1"',
        '',
        'content:',
        '  id: "orchard"',
        '  name: "Orchard"',
        '  elements:',
        '    - kind: container',
        '      id: "press"',
        '      name: "Press"',
        ...stays,
        '# end of the orchard',
        ''
      ),
      name
    );
  }
});

test('the other side of the rule: the block below does not take the trailing comment of the block above when it moves', async () => {
  const text = lines(
    '# the orchard',
    'header:',
    '  kind: "archicode.morin.io/system"',
    '  version: "1"',
    '',
    'content:',
    '  id: "orchard"',
    '  name: "Orchard"',
    '  elements:',
    '    - kind: container',
    '      id: "press"',
    '      name: "Press"',
    '      # about the press',
    '    # the cellar',
    '    - kind: container',
    '      id: "cellar"',
    '      name: "Cellar"',
    '# end of the orchard',
    ''
  );
  const page = await open({ 'app.orchard.yaml': text, 'app.market.yaml': MARKET });
  assert.equal(move(page, 'orchard.cellar', 'market').ok, true);
  await page.sandbox.saveAllChanges();
  assert.ok(
    onDisk(page, 'app.orchard.yaml').includes('      name: "Press"\n      # about the press\n'),
    'the comment of the press stays with the press'
  );
  assert.equal(onDisk(page, 'app.orchard.yaml').includes('# the cellar'), false);
  assert.ok(
    onDisk(page, 'app.market.yaml').includes(
      '    # the cellar\n    - kind: container\n      id: "cellar"\n      name: "Cellar"\n# end of the market'
    )
  );
  assert.equal(onDisk(page, 'app.market.yaml').includes('# about the press'), false);
  // the first child of a parent has no sibling above it: the comment above it is its own, whatever the column
  const first = text.replace(
    '  elements:\n    - kind: container\n      id: "press"',
    '  elements:\n        # about the first child\n    - kind: container\n      id: "press"'
  );
  const second = await open({ 'app.orchard.yaml': first, 'app.market.yaml': MARKET });
  assert.equal(move(second, 'orchard.press', 'market').ok, true);
  await second.sandbox.saveAllChanges();
  // (written as it was, at its column: next to a sibling it now reads as the trailing comment of that sibling, which is what its indentation says)
  assert.ok(
    onDisk(second, 'app.market.yaml').includes(
      '      name: "Stall"\n        # about the first child\n    - kind: container\n      id: "press"\n'
    )
  );
  assert.equal(onDisk(second, 'app.orchard.yaml').includes('# about the first child'), false);
});

test('inside one file: the comment after the last line goes with the block, re-indented with it; the introduction of the next element stays', async () => {
  const text = lines(
    '# the orchard',
    'header:',
    '  kind: "archicode.morin.io/system"',
    '  version: "1"',
    '',
    'content:',
    '  id: "orchard"',
    '  name: "Orchard"',
    '  elements:',
    '    - kind: container',
    '      id: "press"',
    '      name: "Press"',
    '      elements:',
    '        - kind: component',
    '          id: "gauge"',
    '          name: "Gauge"',
    '          # about the gauge',
    '    # the cellar is on its own',
    '    - kind: container',
    '      id: "cellar"',
    '      name: "Cellar"',
    '# end of the orchard',
    ''
  );
  const page = await open({ 'app.orchard.yaml': text });
  assert.equal(move(page, 'orchard.press.gauge', 'orchard.cellar').ok, true);
  await page.sandbox.saveAllChanges();
  assert.equal(
    onDisk(page, 'app.orchard.yaml'),
    lines(
      '# the orchard',
      'header:',
      '  kind: "archicode.morin.io/system"',
      '  version: "1"',
      '',
      'content:',
      '  id: "orchard"',
      '  name: "Orchard"',
      '  elements:',
      '    - kind: container',
      '      id: "press"',
      '      name: "Press"',
      '    # the cellar is on its own',
      '    - kind: container',
      '      id: "cellar"',
      '      name: "Cellar"',
      '      elements:',
      '        - kind: component',
      '          id: "gauge"',
      '          name: "Gauge"',
      '          # about the gauge',
      '# end of the orchard',
      ''
    )
  );
});

test('to the top level: the comment after the last line goes into the manifest of its own, which both tools read', async () => {
  const nested = SOLUTION;
  const page = await open({ 'app.orchard.yaml': nested });
  assert.equal(move(page, 'orchard.press', ' top level').ok, true);
  await page.sandbox.saveAllChanges();
  assert.equal(
    onDisk(page, 'app.press.yaml'),
    lines(
      'header:',
      '  kind: archicode.morin.io/system',
      '  version: "1"',
      'content:',
      '  # the press comes first',
      '  id: "press"',
      '  name: "Press"',
      '  # about the press, after its last line',
      ''
    )
  );
  assert.equal(onDisk(page, 'app.orchard.yaml').includes('# about the press'), false);
  assert.ok(onDisk(page, 'app.orchard.yaml').includes('    # the cellar is on its own\n'));
  const again = createApp({});
  await again.loadWorkspace(page.mem.handle);
  assert.equal(again.__state().fatalError, null);
  assert.deepEqual(plain(Array.from(again.__state().index.application.keys()).sort()), [
    'orchard',
    'orchard.cellar',
    'press'
  ]);
});

test('a file with a mark, Windows line breaks and a trailing comment: all three survive the move', async () => {
  const crlf = (text) => text.replace(/\n/g, '\r\n');
  const page = await open({ 'app.orchard.yaml': MARK + crlf(ORCHARD), 'app.market.yaml': crlf(MARKET) });
  assert.equal(move(page, 'orchard.press', 'market').ok, true);
  await page.sandbox.saveAllChanges();
  const left = onDisk(page, 'app.orchard.yaml');
  const joined = onDisk(page, 'app.market.yaml');
  assert.ok(left.startsWith(MARK + '# the orchard\r\n'));
  assert.equal(left.split('\r\n').length, left.split('\n').length);
  assert.equal(joined.split('\r\n').length, joined.split('\n').length);
  assert.ok(
    joined.includes('      name: "Press"\r\n      # about the press, after its last line\r\n# end of the market\r\n')
  );
  assert.equal(left.includes('# about the press'), false);
});

test('the functions of the text on a block with no comment after it give what they gave before (cut, paste and in-file move on the shipped layout)', () => {
  const sandbox = createApp({});
  const text = ORCHARD.replace('      # about the press, after its last line\n', '');
  const oldValue = parts(sandbox, text);
  const cut = run(sandbox, 'cutBlockFromText')(text, oldValue, ['elements', 0]);
  assert.notEqual(cut, null);
  assert.deepEqual(plain(cut.carried), [
    '    # the press comes first',
    '    - kind: container',
    '      id: "press"',
    '      name: "Press"'
  ]);
  assert.equal(
    cut.text,
    text.replace('    # the press comes first\n    - kind: container\n      id: "press"\n      name: "Press"\n', '')
  );
});
