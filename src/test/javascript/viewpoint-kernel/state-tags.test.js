'use strict';
// A state written by hand looks the same in the editor and on the command line (run 0043, issue 28, decision D-5 of wave 009).
// The rule: a box gets the default look of a state (new, changed, ...) only when the state is computed for it. A word written by
// hand on a box that does not have the state keeps the author's own style of that name, and nothing of the default.
// StateTagRuleTest.java proves the same on the same files, src/test/resources/plateau-state-tags (an invented ticket office
// in two states): on the command line the box is written with another stereotype, here its look carries no default variable.
// The harness has no DOM and no ELK: the kernel is the real embedded module and the layout is a fake one.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const FIXTURE = path.resolve(__dirname, '../../resources/plateau-state-tags');
const plain = (value) => JSON.parse(JSON.stringify(value));

function fakeLayout(graph) {
  const place = (node, x) => Object.assign({}, node, {
    x, y: 0, width: node.width || 400, height: node.height || 200,
    children: (node.children || []).map((child, i) => place(child, 10 + i * 20))
  });
  return Object.assign(place(graph, 0), {
    width: 900, height: 600,
    edges: graph.edges.map((edge) => Object.assign({}, edge, {
      sections: [{ startPoint: { x: 1, y: 1 }, bendPoints: [{ x: 5, y: 1 }], endPoint: { x: 9, y: 9 } }],
      labels: (edge.labels || []).map((label) => Object.assign({ x: 3, y: 3 }, label))
    }))
  });
}

/** The editor on the invented ticket office, `after` drawn, compared with `before` when `compare` is true. */
async function open(compare) {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(FIXTURE);
  state.folder = { handle, name: 'plateau-state-tags' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  await sandbox.loadViewpointKernel();
  await sandbox.drawPlateau('after');
  if (compare) await sandbox.compareWithPlateau('before');
  return { sandbox, state };
}

/** The map of the office as the page draws it. */
async function draw(sandbox) {
  vm.runInContext("currentPerspective = 'map';", sandbox);
  const kernel = await sandbox.loadViewpointKernel();
  const { input } = sandbox.buildKernelInput('map', '', { opened: ['office'] });
  const result = kernel.compute(input);
  assert.equal(result.error, undefined);
  const comparison = sandbox.comparisonState();
  if (comparison && comparison.layers) sandbox.tellRemovedItems(result, comparison, input.layer);
  const graph = sandbox.buildElkGraph(result, { captions: false });
  const svg = sandbox.renderDiagramSvg(fakeLayout(graph), result, '', { map: true, show: { labels: false } }).html;
  return { result, svg };
}

function nodeOf(svg, id) {
  const at = svg.indexOf('data-id="' + id + '"');
  assert.ok(at > 0, id + ' is drawn');
  const start = svg.lastIndexOf('<g class="dg-node', at);
  const ends = ['<g class="dg-node', '<g class="dg-links"', '<g class="dg-link"', '<g class="dg-fold"', '<text class="dg-label"', '</svg>'].map((m) => svg.indexOf(m, start + 10)).filter((i) => i > 0);
  return svg.slice(start, Math.min(...ends));
}
const styleOf = (node) => { const m = /^<g [^>]*? style="([^"]*)"/.exec(node); return m ? m[1] : ''; };
const varsOf = (node) => Object.fromEntries(styleOf(node).split(';').filter(Boolean).map((d) => [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 1)]));

// What the outcome is, for both tools, on this case: the box that has the state computed has the default look of the state (the thick line of
// `new`, a tint, a glyph) and the author's line colour over it; a box that carries the word without having the state has the author's line
// colour and nothing of the default.
const AUTHOR_LINE = '#7b3fa0';

test('an unchanged element with a hand-written `new` keeps the author\'s own look, in a view where something else is new', async () => {
  const { sandbox } = await open(true);
  const { result, svg } = await draw(sandbox);
  const item = (id) => result.items.find((i) => i.id === id);

  // what the kernel says: the author's word is kept on the box that did not change, the state is not computed for it
  assert.equal(item('office.counter').change, 'none');
  assert.deepEqual(plain(item('office.counter').stereotypes), ['new']);
  assert.equal(item('office.kiosk').change, 'new');

  // the box that has the state: the default look of `new`, the author's colour of the line over it
  const kiosk = varsOf(nodeOf(svg, 'office.kiosk'));
  assert.equal(kiosk['--st-width'], '3px', 'the thick line of the state');
  assert.equal(kiosk['--st-stroke'], AUTHOR_LINE, 'the author\'s colour wins, property by property');
  assert.equal(kiosk['--st-tint'], 'var(--chg-new)');
  assert.match(nodeOf(svg, 'office.kiosk'), /dg-glyph/);

  // the unchanged box that carries the word: the author's style of `new` and nothing of the default
  const counter = varsOf(nodeOf(svg, 'office.counter'));
  assert.equal(counter['--st-stroke'], AUTHOR_LINE, 'the author\'s own style');
  assert.ok(!('--st-width' in counter), 'no thick line');
  assert.ok(!('--st-tint' in counter), 'no tint');
  assert.doesNotMatch(nodeOf(svg, 'office.counter'), /dg-glyph|dg-tint/, 'no glyph of the state');
});

test('the same for `changed` on an unchanged element, and for `new` on an element that changed', async () => {
  const { sandbox } = await open(true);
  const { result, svg } = await draw(sandbox);
  const item = (id) => result.items.find((i) => i.id === id);

  // `changed` on an element that did not change: no style of the author for it, so no look at all
  assert.equal(item('office.queue').change, 'none');
  assert.deepEqual(plain(item('office.queue').stereotypes), ['changed']);
  assert.doesNotMatch(nodeOf(svg, 'office.queue'), /dg-styled|dg-glyph|dg-tint/);

  // `new` on an element that changed: the computed state is last and has the default look of `changed`; the hand-written `new` adds the author's
  // style of `new` under it and no more
  assert.equal(item('office.printer').change, 'changed');
  assert.deepEqual(plain(item('office.printer').stereotypes), ['new', 'changed']);
  const printer = varsOf(nodeOf(svg, 'office.printer'));
  assert.equal(printer['--st-width'], '2px', 'the line of `changed`, not the thick line of `new`');
  assert.equal(printer['--st-dash'], '2 3');
  assert.match(nodeOf(svg, 'office.printer'), /dg-glyph/);

  // `new` on an element that is new: the word and the state agree, one look
  assert.deepEqual(plain(item('office.window').stereotypes), ['new']);
  assert.equal(varsOf(nodeOf(svg, 'office.window'))['--st-width'], '3px');
});

test('without a comparison the hand-written word has the author\'s style and nothing else, and the drawing is the one it always was', async () => {
  const { sandbox } = await open(false);
  const { svg } = await draw(sandbox);
  for (const id of ['office.counter', 'office.printer', 'office.window']) {
    const vars = varsOf(nodeOf(svg, id));
    assert.equal(vars['--st-stroke'], AUTHOR_LINE, id);
    assert.ok(!('--st-width' in vars) && !('--st-tint' in vars), id);
    assert.doesNotMatch(nodeOf(svg, id), /dg-glyph|dg-tint/, id);
  }
  assert.doesNotMatch(nodeOf(svg, 'office.queue'), /dg-styled/);
});
