'use strict';
// The cache of the comparison in the editor (run 0045, issue #32): `comparisonState()` keeps the answer of the kernel's `compare` for as long as the
// version of the two models (the plateau drawn and the one it is compared with) is what it was, instead of serialising both models on every call to
// find out. The version is bumped by `modelsChanged()`: by every load, every edit that ends in a rebuild of the model, every change of baseline.
// What is checked here: the answer is kept through plain renders and nothing is serialised to keep it; a load, an edit of the plateau drawn, a change
// of the comparison, a reload of the folder and a change of plateau each compute it again, and the new answer is the right one; the choke point is what decides;
// and no place of the page replaces a model without calling it. The harness has no DOM and no layout engine; the kernel is the real embedded module.
// Everything here is invented (a ferry company).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { inPlateau, layeredFiles, openLayered, compareWith } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const run = (sandbox, code) => vm.runInContext(code, sandbox);

// ---- an invented ferry company in three plateaus ----

const element = (kind, parent, id, name, extra) =>
  'header:\n  kind: "archicode.morin.io/' +
  kind +
  '"\n' +
  (parent ? '  parent: "' + parent + '"\n' : '') +
  '  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "' +
  name +
  '"\n' +
  (extra || '');
const rel = (destination, label) =>
  '  relationships:\n    - destination: "' + destination + '"\n      label: "' + label + '"\n';

const FLEET_NOW = {
  'app.fleet.yaml': element('system', null, 'fleet', 'Fleet'),
  'app.fleet.dock.yaml': element('container', 'fleet', 'dock', 'Dock planner', rel('fleet.ferry', 'schedules')),
  'app.fleet.ferry.yaml': element('container', 'fleet', 'ferry', 'Ferry log'),
  'app.fleet.radio.yaml': element('container', 'fleet', 'radio', 'Radio desk')
};
const FLEET_NEXT = {
  'app.fleet.yaml': element('system', null, 'fleet', 'Fleet'),
  'app.fleet.dock.yaml': element('container', 'fleet', 'dock', 'Dock planner', rel('fleet.ferry', 'schedules')),
  'app.fleet.ferry.yaml': element('container', 'fleet', 'ferry', 'Ferry log'),
  'app.fleet.beacon.yaml': element('container', 'fleet', 'beacon', 'Beacon feed')
};
const FLEET_LATER = Object.assign({}, FLEET_NEXT, {
  'app.fleet.ferry.yaml': element('container', 'fleet', 'ferry', 'Ferry log, v2')
});
const folder = (dir, files) =>
  Object.fromEntries(Object.entries(files).map(([name, body]) => ['plateaus/' + dir + '/' + name, body]));
const FILES = Object.assign(
  {},
  folder('10_now', FLEET_NOW),
  folder('20_next', FLEET_NEXT),
  folder('30_later', FLEET_LATER)
);
const PLATEAU_LIST = [
  { id: 'now', path: 'plateaus/10_now' },
  { id: 'next', path: 'plateaus/20_next' },
  { id: 'later', path: 'plateaus/30_later' }
];

/**
 * The page on the invented company as layers (see layered-folders.js: three siblings over an empty baseline), `later` drawn, compared with `now` (or with nothing) on the band,
 * with a spy on the kernel's `compare` and on `JSON.stringify`.
 */
async function open(compareTo = 'now') {
  const { sandbox, state, mem } = await openLayered(
    createApp,
    memFolder,
    layeredFiles(PLATEAU_LIST, FILES, '  current: later\n'),
    {}
  );
  if (compareTo) compareWith(sandbox, compareTo);
  // the spies: `compares` counts the calls of the kernel's `compare`; `serialised` keeps what `JSON.stringify` returned, from the sandbox's own `JSON`
  run(
    sandbox,
    `
    globalThis.__spy = { compares: 0, serialised: [] };
    const kernel = loadedKernel;
    const compare = kernel.compare;
    kernel.compare = function (input) { __spy.compares++; return compare.call(this, input); };
    const stringify = JSON.stringify;
    JSON.stringify = function (...args) { const text = stringify.apply(this, args); __spy.serialised.push(typeof text === 'string' ? text : ''); return text; };
  `
  );
  const spy = {
    get compares() {
      return run(sandbox, '__spy.compares');
    },
    /** What was serialised since the last call, and whether any of it holds an element of a model. */
    takeModelSerialisations() {
      return JSON.parse(
        run(
          sandbox,
          "JSON.stringify(__spy.serialised.splice(0).filter((t) => t.includes('\"reference\"') && t.includes('fleet.')).length)"
        )
      );
    }
  };
  spy.takeModelSerialisations(); // drop what the set-up serialised
  return { sandbox, state, mem, spy };
}

const changed = (state) => state.counts.elements.changed;

// ---- 1. A plain render serialises nothing ----

test('a render with a comparison on keeps the answer of the kernel and serialises neither model', async () => {
  const { sandbox, spy } = await open();
  const first = sandbox.comparisonState();
  assert.equal(first.counts.elements.removed, 1, 'the radio desk is gone, the beacon feed is new');
  const before = spy.compares;
  spy.takeModelSerialisations();
  for (let i = 0; i < 3; i++) {
    sandbox.render(); // the header, the trees (`treeChangeOf`), the right panel, the address (`currentRouteHash`)
    sandbox.renderElementsNavHtml(false);
    sandbox.currentRouteHash();
    sandbox.buildKernelInput('map', '', { opened: ['fleet'] });
    assert.equal(sandbox.comparisonState().layers, first.layers, 'the same answer, not a copy of it');
  }
  assert.equal(spy.compares - before, 0, 'the kernel is not asked again');
  assert.equal(spy.takeModelSerialisations(), 0, 'and no model is serialised to find that out');
});

test('what the test looks for is real: serialising the input of the comparison is seen by it', async () => {
  const { sandbox, spy } = await open();
  run(sandbox, 'JSON.stringify(comparisonInput())');
  assert.equal(spy.takeModelSerialisations(), 1);
});

// ---- 2. Each way to change a model asks the kernel again, once, and gets the right answer ----

test('a load asks again, once, and a plain render after it does not', async () => {
  const { sandbox, state, mem, spy } = await open();
  const first = sandbox.comparisonState();
  mem.put(
    'plateaus/30_later/app.fleet.radio.yaml',
    inPlateau('later', element('container', 'fleet', 'radio', 'Radio desk'))
  ); // the radio desk is back in the plateau drawn
  const before = spy.compares;
  await sandbox.loadWorkspace(mem.handle); // the folder is read again
  assert.equal(state.layers.compare && state.layers.compare.other, 'now', 'the comparison is remembered by the folder');
  const second = sandbox.comparisonState();
  assert.notEqual(second.layers, first.layers);
  assert.equal(second.counts.elements.removed, 0, 'the answer is the one of the new load');
  assert.equal(spy.compares - before, 1, 'one compare for the load (its own render), none for what follows');
  sandbox.render();
  assert.equal(spy.compares - before, 1);
});

test('an edit of the plateau drawn asks again: a rename, a created element, a deleted one, a change of a file', async () => {
  const { sandbox, state, spy } = await open();
  const answers = [sandbox.comparisonState()];
  const version = () => run(sandbox, 'modelVersion');
  let seen = version();
  const step = (label, expected) => {
    assert.ok(version() > seen, label + ': the version of the models moved');
    seen = version();
    const answer = sandbox.comparisonState();
    assert.notEqual(answer.layers, answers[answers.length - 1].layers, label + ': asked again');
    assert.equal(sandbox.comparisonState().layers, answer.layers, label + ': and only once');
    if (expected) expected(answer);
    answers.push(answer);
  };
  const before = spy.compares;

  sandbox.commitElementEdit('fleet.dock', (node) => {
    node.name = 'Dock planner, v2';
  });
  step('rename', (s) => assert.equal(changed(s), 2, 'the dock planner and the ferry log'));

  const created = sandbox.commitCreateChildElement({
    parentReference: 'fleet',
    layer: 'application',
    kind: 'container',
    id: 'pier',
    name: 'Pier camera',
    description: ''
  });
  assert.equal(created.ok, true);
  step('creation', (s) => assert.equal(s.counts.elements.new, 2, 'the beacon feed and the pier camera'));

  const impact = sandbox.computeDeleteImpact('fleet.pier', 'application');
  sandbox.commitDeleteElement('fleet.pier', 'application', impact.affected);
  step('deletion', (s) => assert.equal(s.counts.elements.new, 1));

  sandbox.commitFileEdit(
    'plateaus/30_later/app.fleet.beacon.yaml',
    inPlateau('later', element('container', 'fleet', 'beacon', 'Beacon feed, v2'))
  );
  step('edit of a file', (s) => assert.equal(s.counts.elements.new, 1));

  assert.equal(spy.compares - before, 4, 'one compare per edit, and none for the reads in between');
  assert.equal(state.dirtyReferences.size > 0, true);
});

test('an edit of the settings moves the version too (the models are rebuilt from them)', async () => {
  const { sandbox } = await open();
  const before = run(sandbox, 'modelVersion');
  sandbox.commitSettingsEdit((settings) => {
    settings.relationships.defaultSyntheticLabel = 'uses';
  });
  assert.ok(run(sandbox, 'modelVersion') > before);
});

test('Cancel (the folder is read again from disk) asks again, and what was edited is gone from the answer', async () => {
  const { sandbox, state, spy } = await open();
  sandbox.commitElementEdit('fleet.dock', (node) => {
    node.name = 'Dock planner, v2';
  });
  assert.equal(changed(sandbox.comparisonState()), 2);
  const before = spy.compares;
  await sandbox.loadWorkspace(state.folder.handle);
  assert.equal(changed(sandbox.comparisonState()), 1, 'the ferry log only');
  assert.equal(spy.compares - before, 1);
});

test('a change of the comparison on the band asks again, and the folder read again from the disk (Cancel, Reload) is the only way the disk is seen', async () => {
  const { sandbox, state, mem, spy } = await open('now');
  const first = sandbox.comparisonState();
  assert.equal(first.base.id, 'now');
  let before = spy.compares;

  compareWith(sandbox, 'next');
  const toNext = sandbox.comparisonState();
  assert.equal(toNext.base.id, 'next');
  assert.equal(changed(toNext), 1);
  assert.equal(spy.compares - before, 1);

  compareWith(sandbox, '');
  assert.equal(sandbox.comparisonState(), null, 'nothing is compared');
  before = spy.compares;
  compareWith(sandbox, 'next');
  assert.equal(sandbox.comparisonState().base.id, 'next');
  assert.equal(spy.compares - before, 1, 'a comparison turned off and on again is computed again');

  mem.put(
    'plateaus/20_next/app.fleet.ferry.yaml',
    inPlateau('next', element('container', 'fleet', 'ferry', 'Ferry log, v2'))
  ); // the folder of the other plateau changes on disk
  before = spy.compares;
  assert.equal(changed(sandbox.comparisonState()), 1, 'the page does not watch the disk');
  assert.equal(spy.compares - before, 0);
  await sandbox.loadWorkspace(state.folder.handle);
  assert.equal(changed(sandbox.comparisonState()), 0, 'the folder read again: the ferry log is the same in both now');
  assert.equal(spy.compares - before, 1);
  assert.equal(state.baseline.index.application.get('fleet.ferry').name, 'Ferry log, v2');
});

test('a change of plateau asks again, for the plateau now drawn', async () => {
  const { sandbox, state, spy } = await open('now');
  assert.equal(sandbox.comparisonState().target.id, 'later');
  const before = spy.compares;
  sandbox.drawPlateau('next');
  const answer = sandbox.comparisonState();
  assert.equal(state.layers.current, 'next');
  assert.equal(answer.target.id, 'next');
  assert.equal(changed(answer), 0, 'the ferry log of `next` is the one of `now`');
  assert.equal(spy.compares - before, 1);
});

// ---- 3. The choke point ----

test('the version decides: a record changed in place is seen once `modelsChanged()` is called, and not before', async () => {
  const { sandbox, state, spy } = await open();
  const first = sandbox.comparisonState();
  state.index.application.get('fleet.dock').name = 'Dock planner, changed in place';
  assert.equal(
    sandbox.comparisonState().layers,
    first.layers,
    'no bump, no new answer: the models are not read to find out'
  );
  sandbox.modelsChanged();
  const before = spy.compares;
  const second = sandbox.comparisonState();
  assert.notEqual(second.layers, first.layers);
  assert.equal(spy.compares - before, 1);
  assert.equal(changed(second), 2);
});

test('a model that is replaced without the bump is not served from the cache either (the net under a forgotten call)', async () => {
  const { sandbox, spy } = await open();
  const first = sandbox.comparisonState();
  const before = spy.compares;
  run(sandbox, 'AppState.index = Object.assign({}, AppState.index);');
  assert.notEqual(sandbox.comparisonState().layers, first.layers);
  assert.equal(spy.compares - before, 1);
  run(
    sandbox,
    'AppState.baseline = Object.assign({}, AppState.baseline, { index: Object.assign({}, AppState.baseline.index) });'
  );
  assert.equal(sandbox.comparisonState().layers === first.layers, false);
  assert.equal(spy.compares - before, 2);
});

test('every place of the page that replaces a model calls modelsChanged() right after (the rule of `modelVersion`)', () => {
  const script = HTML.match(/<script>([\s\S]*?)<\/script>/)[1].split('\n');
  const assignments = [];
  script.forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;
    if (/\bAppState\.(index|baseline)\s*=[^=]/.test(line)) assignments.push(i);
  });
  assert.ok(assignments.length >= 6, 'the loads and the rebuild assign the models (found ' + assignments.length + ')');
  for (const i of assignments) {
    assert.ok(
      script.slice(i, i + 12).some((line) => /\bmodelsChanged\(\)/.test(line)),
      'line ' +
        (i + 1) +
        ' of the script assigns a model and does not call modelsChanged() within 12 lines: ' +
        script[i].trim().slice(0, 100)
    );
  }
  // a new AppState is new models; the cache is not keyed on anything else
  assert.match(script.join('\n'), /function createInitialAppState\(\) \{\s*modelsChanged\(\);/);
  assert.doesNotMatch(
    script.join('\n'),
    /comparisonCache\.key|const key = JSON\.stringify\(input\);\s*\n\s*if \(!comparisonCache/
  );
});
