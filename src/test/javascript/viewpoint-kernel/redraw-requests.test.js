'use strict';
// A part below the composition asks for a redraw with `requestRedraw()` and never calls `render()` (wave 024, run 0187, W-11; RFC-002 rule 2). `modelsChanged()` bumps
// the version the caches read and draws nothing. The composition says what draws with `onRedraw`, once, when it loads; the request is carried out at once.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const EDITOR = path.resolve(__dirname, '../../../main/editor');

/** The page with `render` and `modelsChanged` counted; `order` records what happened, in order. */
function counted(sandbox) {
  run(
    sandbox,
    'globalThis.__order = []; { const r = render; render = function (...a) { __order.push("render"); return r.apply(this, a); };' +
      ' const m = modelsChanged; modelsChanged = function (...a) { __order.push("modelsChanged"); return m.apply(this, a); }; }'
  );
  return () => JSON.parse(run(sandbox, 'JSON.stringify(__order)'));
}

test('modelsChanged() bumps the version and does not redraw', () => {
  const sandbox = createApp({});
  const order = counted(sandbox);
  const before = run(sandbox, 'modelVersion');
  sandbox.modelsChanged();
  assert.equal(run(sandbox, 'modelVersion'), before + 1);
  assert.deepEqual(order(), ['modelsChanged']);
});

test('requestRedraw() carries the request out at once, through the render the composition registered, looked up at each request', () => {
  const sandbox = createApp({});
  const order = counted(sandbox);
  sandbox.requestRedraw();
  sandbox.requestRedraw();
  assert.deepEqual(order(), ['render', 'render']);
});

test('requestRedraw() with no handler registered does nothing', () => {
  const sandbox = createApp({});
  const order = counted(sandbox);
  run(sandbox, 'onRedraw(null)');
  sandbox.requestRedraw();
  assert.deepEqual(order(), []);
});

test('a change to a model made by a lower layer bumps the version first and then requests the redraw', async () => {
  const sandbox = createApp({});
  const handle = makeDirHandle(LAYERED);
  const state = sandbox.__state();
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  const order = counted(sandbox);
  const asked = run(
    sandbox,
    '(() => { let n = 0; const r = requestRedraw; requestRedraw = function () { n++; return r.apply(this, arguments); }; return () => n; })()'
  );
  const before = run(sandbox, 'modelVersion');
  sandbox.rebuildIndexAndRender(); // the path of every edit of the plateau drawn, in the application layer
  assert.ok(run(sandbox, 'modelVersion') > before);
  assert.equal(asked(), 1);
  const seen = order();
  assert.equal(seen[0], 'modelsChanged');
  assert.equal(seen.filter((word) => word === 'render').length, 1);
  assert.equal(seen[seen.length - 1], 'render'); // the version is bumped before anything is drawn from the models
});

test('no part below the composition calls render() in code: it asks with requestRedraw()', () => {
  const config = JSON.parse(fs.readFileSync(path.join(EDITOR, 'layers.json'), 'utf8'));
  const offenders = [];
  for (const part of config.parts) {
    if (part.layer === 'composition') continue;
    const lines = fs.readFileSync(path.join(EDITOR, part.file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const code = line.includes('//') ? line.slice(0, line.indexOf('//')) : line;
      if (/(?<![\w.$'"-])render\(/.test(code)) offenders.push(`${part.file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});
