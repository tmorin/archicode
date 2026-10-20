'use strict';
// Wave 015, run 0097 (W-9, #98): the band chooses the plateau drawn and the plateau compared with, on the pages of the perspective Timeline, and does nothing else. It is on the
// pages Plateaus, Applications, Environments and Elements and not on Stories, Files and Settings; it writes nothing (the controls of a plateau are the page Plateaus's); it is two
// lists and, when there are mistakes, one button, whatever the number of plateaus; and the plateau drawn and the comparison are `AppState.layers`, which a visit to a page without the
// band does not touch. What a window shows at 360 or 1280 px is a measure in a browser (the run document gives it); here is what the markup and the state say.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');
const { memFolder } = require('./mem-folder');
const { click } = require('./library-page');
const { layeredFiles, chooseOnBand, bandOf } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const TIMELINE_PAGES = ['plateaus', 'map', 'environments', 'elements'];
const OTHER_PAGES = ['library', 'files', 'settings'];

async function openLayered() {
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state };
}

/** A chain of `n` plateaus over baseline, each overriding the one before, in one folder each (invented names). */
async function openChain(n) {
  const plateaus = [];
  const files = {};
  for (let i = 1; i <= n; i++) {
    const id = 'step' + i;
    plateaus.push({ id, name: 'Step ' + i + ' of the long way to a platform nobody will recognise', horizon: (2026 + Math.floor((i - 1) / 4)) + '-Q' + (((i - 1) % 4) + 1), override: i === 1 ? undefined : 'step' + (i - 1), path: 'plateaus/' + id });
    files['plateaus/' + id + '/s' + i + '.yaml'] = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "s' + i + '"\n  name: "Service ' + i + '"\n';
  }
  const mem = memFolder(layeredFiles(plateaus, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'chain' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state };
}

test('the band is on the four pages of Timeline and on no other page', async () => {
  const { sandbox } = await openLayered();
  for (const page of TIMELINE_PAGES) {
    sandbox.setPerspective(page);
    assert.match(sandbox.renderShellHtml(), /<nav class="plateau-band col-span-3" id="plateau-band"/, page + ' has the band');
  }
  for (const page of OTHER_PAGES) {
    sandbox.setPerspective(page);
    assert.doesNotMatch(sandbox.renderShellHtml(), /plateau-band/, page + ' has no band');
  }
  // the rows of the shell follow: the top bar, the band, the pages, the page; or the top bar and the page
  sandbox.setPerspective('map');
  assert.match(sandbox.renderShellHtml(), /grid-rows-\[auto_auto_auto_minmax\(0,1fr\)\]/);
  sandbox.setPerspective('files');
  assert.match(sandbox.renderShellHtml(), /grid-rows-\[auto_minmax\(0,1fr\)\]/);
});

test('the plateau drawn and the comparison survive a visit to Stories, Files and Settings, and the pages that read them keep working', async () => {
  const { sandbox, state } = await openLayered();
  chooseOnBand(sandbox, 'plateau', 'saas');
  chooseOnBand(sandbox, 'compare', 'past');
  const before = plain(state.layers);
  const index = state.index;
  const baseline = state.baseline;
  assert.deepEqual(before, { current: 'saas', compare: { mode: 'past', other: 'baseline', chosen: false }, blocked: null });
  for (const page of OTHER_PAGES) {
    sandbox.setPerspective(page);
    const shell = sandbox.renderShellHtml();
    assert.doesNotMatch(shell, /plateau-band/);
    assert.deepEqual(plain(state.layers), before, page + ' leaves the layers as they were');
    assert.equal(state.index, index, page + ' draws the same model');
    assert.equal(state.baseline, baseline, page + ' keeps the plateau compared with');
    if (page === 'files') assert.match(shell, /saas\/application\/commerce-saas\.yaml/, 'Files lists the files of the plateau drawn');
    if (page === 'library') assert.doesNotMatch(shell, /plateaus it overrides|belong to other plateaus/, 'Stories says nothing of the plateau drawn: a story belongs to none');
    assert.equal(run(sandbox, 'recalledPlateauId()'), 'saas', 'and the choice is still the one kept for the folder');
  }
  sandbox.setPerspective('map');
  const band = bandOf(sandbox);
  assert.deepEqual([band.drawn, band.compared], ['saas', 'past'], 'the band comes back saying what it said');
  // a change made while the band is not there is the same change: the address of a page without it names the plateau
  sandbox.setPerspective('files');
  assert.match(sandbox.location.hash, /^#\/files\?plateau=saas/);
});

test('the band writes nothing: what writes a plateau is on the page Plateaus and in `plateauWritingHtml` only', async () => {
  const { sandbox } = await openLayered();
  sandbox.setPerspective('plateaus');
  const band = sandbox.renderPlateauBandHtml();
  assert.doesNotMatch(band, /New plateau|Edit plateau|writing in|plateau-create|plateau-edit|band-writing/);
  assert.match(sandbox.renderPlateausPageHtml(), /New plateau<\/button>[\s\S]*Edit plateau<\/button>/);
  // in the source: the three phrases of the controls appear in the function that makes them, and nowhere in the band
  const start = HTML.indexOf('function plateauWritingHtml()');
  const end = HTML.indexOf('\n}\n', start);
  const writer = HTML.slice(start, end);
  assert.match(writer, /writing in:/);
  assert.match(writer, />New plateau</);
  assert.match(writer, />Edit plateau</);
  const rest = HTML.slice(0, start) + HTML.slice(end);
  assert.doesNotMatch(rest.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''), />New plateau<|>Edit plateau<|writing in:/, 'the phrases are in no other function');
  assert.ok(!HTML.includes('function bandWritingHtml'), 'and the band no longer has its own');
});

test('the band holds two lists and nothing else, whatever the number of plateaus: on a chain of eight there is no tree, no row of buttons, and the plateau drawn is one the list says', async () => {
  const short = await openLayered();
  const { sandbox, state } = await openChain(8);
  for (const sb of [short.sandbox, sandbox]) {
    const html = sb.renderPlateauBandHtml();
    assert.equal((html.match(/<select /g) || []).length, 2);
    assert.ok(!/<(ul|li|button)\b/.test(html), 'no tree and no button while nothing is wrong');
  }
  const band = bandOf(sandbox);
  assert.deepEqual(plain(band.plateaus.map((o) => o.value)), ['baseline'].concat(Array.from({ length: 8 }, (_, i) => 'step' + (i + 1))));
  chooseOnBand(sandbox, 'plateau', 'step8');
  const drawn = bandOf(sandbox);
  assert.equal(drawn.drawn, 'step8', 'the plateau drawn is selected, however far down the chain it is');
  assert.match(drawn.html, /<option value="step8" selected> {6}Step 8 /, 'indented by its depth, up to six steps, so that a long chain does not push its names out of the list');
  // nothing, the past that follows the plateau drawn, then the whole tree, in which the plateau drawn is greyed
  assert.deepEqual(plain(drawn.compare.slice(0, 2).map((o) => o.value)), ['', 'past']);
  assert.equal(drawn.compare.length, 2 + 9, 'nothing, the past, and the nine plateaus');
  assert.deepEqual(plain(drawn.compare.slice(2).map((o) => o.value)), ['baseline'].concat(Array.from({ length: 8 }, (_, i) => 'step' + (i + 1))).map((id) => 'plateau:' + id));
  assert.deepEqual(plain(drawn.compare.filter((o) => o.disabled).map((o) => o.value)), ['plateau:step8']);
  assert.match(drawn.html, /<option value="plateau:step8" disabled>\u2003{6}Step 8 /, 'indented like the other list');
  chooseOnBand(sandbox, 'compare', 'plateau:step2');
  assert.deepEqual(plain(state.layers.compare), { mode: 'other', other: 'step2', chosen: true });
});

test('the mistakes of the plateaus are one button on the band that opens the sentences of the command line, and they are not lost', async () => {
  const PLATEAU = (id, extra) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + extra;
  const SYSTEM = (id) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
  const mem = memFolder({
    'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n',
    'app.ferry.yaml': SYSTEM('ferry'),
    'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: SET\n      target: nope\n      field: name\n      value: x\n')
  });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(bandOf(sandbox).mistakes, null, 'baseline is fine: no button');
  chooseOnBand(sandbox, 'plateau', 'later');
  assert.equal(bandOf(sandbox).mistakes, '! 1 mistake');
  assert.match(bandOf(sandbox).html, /<button type="button" class="band-mistakes" data-action="open-mistakes" title="plateau later: patch 1 \(SET target nope\)/);
  // the button opens a dialog that says it, from the state
  click(sandbox, { 'data-action': 'open-mistakes' });
  assert.equal(run(sandbox, 'appDialog').kind, 'mistakes');
  const dialog = sandbox.renderAppDialogHtml();
  assert.match(dialog, /<h2 id="app-dialog-title">Mistakes in the plateaus<\/h2>/);
  assert.match(dialog, /<strong>later cannot be drawn\.<\/strong><ul><li>plateau later: patch 1 \(SET target nope\)/);
  assert.match(dialog, /<p class="band-readonly">The plateau <code>later<\/code> cannot be drawn, so nothing is written in it/);
  // Close closes it and the plateau is still drawn
  click(sandbox, { 'data-action': 'dialog-cancel' });
  assert.equal(run(sandbox, 'appDialog'), null);
  assert.equal(state.layers.current, 'later');
  // the plateau that is compared with and refused counts as well, and says so
  chooseOnBand(sandbox, 'plateau', 'baseline');
  assert.equal(bandOf(sandbox).mistakes, null);
  chooseOnBand(sandbox, 'compare', 'plateau:later');
  assert.equal(bandOf(sandbox).mistakes, '! 1 mistake');
  assert.match(sandbox.renderMistakesDialogBodyHtml(), /later, which the drawing is compared with, cannot be drawn\./);
});

test('a list of the band that cannot be obeyed is put back: a form typed in and not kept, or a write in flight', async () => {
  const { sandbox, state } = await openLayered();
  const confirms = [];
  sandbox.confirm = (message) => { confirms.push(message); return false; };
  run(sandbox, 'var __renders = 0; const __render = render; render = function () { __renders++; return __render.apply(this, arguments); };');
  run(sandbox, 'draftTyped = true');
  chooseOnBand(sandbox, 'plateau', 'saas');
  assert.equal(state.layers.current, 'baseline', 'the person said no to losing what they typed');
  assert.equal(confirms.length, 1);
  assert.equal(run(sandbox, '__renders'), 0, 'the page is not drawn again: what was typed in its form is still there');
  assert.equal(run(sandbox, 'draftTyped'), true);
  run(sandbox, 'draftTyped = false');
  run(sandbox, 'saveInFlight = true');
  chooseOnBand(sandbox, 'plateau', 'saas');
  assert.equal(state.layers.current, 'baseline', 'a write is in flight: the plateau does not change under it');
  assert.equal(run(sandbox, '__renders'), 0);
  assert.equal(bandOf(sandbox).disabled, true, 'and the lists say it');
  run(sandbox, 'saveInFlight = false');
});

test('a list that is disabled while a write is in flight still says what is drawn and what is compared', async () => {
  const { sandbox, state } = await openLayered();
  chooseOnBand(sandbox, 'plateau', 'inhouse');
  chooseOnBand(sandbox, 'compare', 'plateau:marketplace');
  assert.equal(bandOf(sandbox).compared, 'plateau:marketplace');
  run(sandbox, 'saveInFlight = true');
  const band = bandOf(sandbox);
  assert.deepEqual([band.disabled, band.drawn, band.compared], [true, 'inhouse', 'plateau:marketplace'], 'disabled is not "Nothing"');
  assert.match(band.compare.find((o) => o.selected).label, /Marketplace/);
  run(sandbox, 'saveInFlight = false');
  assert.equal(state.layers.compare.mode, 'future');
});
