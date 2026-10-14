'use strict';
// The links of a diagram are one tab stop (run 0025, issue #17 item 4): a roving tabindex, arrow keys, Home and End among
// the links, the stop following the focus, the focus given back to the same twin after a redraw. The harness has no DOM and no
// layout engine: the drawing is built from the real kernel (or by hand) with a fake layout, the page is driven with fake
// elements that remember their attributes and their focus. Real focus order in a real browser is checked on a replica.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openFixture } = require('./harness');
const vm = require('node:vm');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const NONE = { kind: 'none', key: null, mode: 'view' };
const plain = (value) => JSON.parse(JSON.stringify(value));
const linkSelection = (from, to, extra) => Object.assign({ kind: 'link', key: from + ' -> ' + to, from, to, layer: 'application', mode: 'view' }, extra);
const functionSource = (name) => HTML.slice(HTML.indexOf('function ' + name + '('), HTML.indexOf('\nfunction ', HTML.indexOf('function ' + name + '(') + 1));

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

/** Two links from `a` to `b` (twins), one back, and one from `a` to `c`: four links, three pairs. */
function drawnWithTwins(sandbox) {
  const link = (from, to, label) => ({ from, to, label, qualifiers: [], tags: {}, synthetic: false, secondary: false, relationships: [] });
  const result = {
    items: ['a', 'b', 'c'].map((id) => ({ id, reference: id, parent: null })),
    links: [link('a', 'b', 'one'), link('a', 'b', 'two'), link('b', 'a', 'back'), link('a', 'c', 'other')]
  };
  return sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '');
}

/** An element of the drawing as the page reads it: attributes, classes, a focus that fires what a browser fires (focusin). */
function fakeEl(cls, attrs, sandbox, log) {
  const a = Object.assign({}, attrs);
  const classes = new Set(cls.split(' '));
  const el = {
    attrs: a,
    getAttribute: (name) => (name in a ? a[name] : null),
    setAttribute: (name, value) => { a[name] = String(value); },
    classList: { contains: (c) => classes.has(c), add: (c) => classes.add(c), remove: (c) => classes.delete(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) },
    closest: (selector) => (selector.split(',').some((part) => classes.has(part.trim().replace(/^.*\./, ''))) ? el : null),
    focus() { if (log) log.push(a['data-from'] ? a['data-from'] + '>' + a['data-to'] + (a['data-nth'] ? '#' + a['data-nth'] : '') : a['data-id']); if (sandbox) sandbox.handleDiagramFocus({ type: 'focusin', target: el }); }
  };
  return el;
}
const linkEl = (from, to, nth, sandbox, log) => fakeEl('dg-link', Object.assign({ 'data-from': from, 'data-to': to, tabindex: '-1' }, nth === null || nth === undefined ? {} : { 'data-nth': String(nth) }), sandbox, log);
const stops = (links) => links.map((el) => el.attrs.tabindex);

/** A page with these links in a canvas: `document` answers for them, the framing is not touched. */
async function pageWith(links, boxes) {
  const { sandbox, state } = await openFixture();
  const canvas = {
    querySelectorAll: (selector) => (selector === '.dg-link' ? links : selector === '.dg-node' ? (boxes || []) : []),
    contains: () => true,
    focus() { canvas.focused = true; },
    querySelector: () => null
  };
  const document = sandbox.document;
  document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  document.querySelectorAll = (selector) => (selector === '#diagram-canvas .dg-link' ? links : selector === '#diagram-canvas .dg-node' ? (boxes || []) : []);
  document.querySelector = () => null;
  sandbox.revealDiagramNode = () => {};
  run(sandbox, 'diagramLinkStop = null;');
  return { sandbox, state, canvas };
}

/** The elements behave like a browser's: `focus()` logs, then fires what the page listens to (focusin), and they know their canvas. */
function wireFocus(page, elements, log) {
  for (const el of elements) {
    const inner = el.closest;
    el.closest = (selector) => (selector === '#diagram-canvas' ? page.canvas : inner(selector));
    el.focus = () => {
      if (log) log.push(el.attrs['data-id'] || el.attrs['data-from'] + '>' + el.attrs['data-to'] + (el.attrs['data-nth'] ? '#' + el.attrs['data-nth'] : ''));
      page.sandbox.handleDiagramFocus({ type: 'focusin', target: el });
    };
  }
}

// ============================================================ the markup

test('the drawing gives one link the tab stop and every other link none, twins included; the boxes are a roving stop of their own (diagram-box-tab-stops.test.js)', async () => {
  const { sandbox } = await openFixture();
  const drawing = drawnWithTwins(sandbox);
  const links = drawing.html.match(/<g class="dg-link"[^>]*>/g);
  assert.equal(links.length, 4);
  assert.deepEqual(links.map((g) => g.match(/tabindex="(-?\d)"/)[1]), ['0', '-1', '-1', '-1'], 'the first link drawn, until the page says otherwise');
  assert.ok(links.every((g) => /role="button"/.test(g) && /aria-pressed="false"/.test(g) && /aria-label="Link from/.test(g)), 'what a link was is still there');
  const captions = drawing.html.match(/<text class="dg-label"[^>]*>/g);
  assert.ok(captions.length > 0 && captions.every((t) => !t.includes('tabindex')), 'a caption is clickable, never a stop');
  const boxes = drawing.html.match(/<g class="dg-node[^>]*>/g);
  assert.ok(boxes.length === 3 && boxes.filter((g) => g.includes('tabindex="0"')).length === 1 && boxes.filter((g) => g.includes('tabindex="-1"')).length === 2, 'the boxes are one stop together, like the links');
});

test('a drawing with a single link, and one with none, are well formed', async () => {
  const { sandbox } = await openFixture();
  const result = { items: [{ id: 'a', reference: 'a', parent: null }, { id: 'b', reference: 'b', parent: null }], links: [] };
  assert.ok(!sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '').html.includes('dg-link'));
  result.links.push({ from: 'a', to: 'b', label: 'x', qualifiers: [], tags: {}, synthetic: false, secondary: false, relationships: [] });
  assert.match(sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '').html, /<g class="dg-link"[^>]*tabindex="0"/);
});

// ============================================================ which link is the stop

test('with no memory and no selection the first link is the stop; the others are not, and running it again changes nothing', async () => {
  const links = [linkEl('a', 'b', 0), linkEl('a', 'b', 1), linkEl('b', 'a')];
  const { sandbox, canvas } = await pageWith(links);
  sandbox.syncLinkTabStop(canvas);
  assert.deepEqual(stops(links), ['0', '-1', '-1']);
  sandbox.syncLinkTabStop(canvas);
  assert.deepEqual(stops(links), ['0', '-1', '-1']);
});

test('a selected link is the stop, over the first: the first link of its pair', async () => {
  const links = [linkEl('a', 'b', 0), linkEl('b', 'a'), linkEl('c', 'a', 0), linkEl('c', 'a', 1)];
  const { sandbox, state, canvas } = await pageWith(links);
  state.selection = linkSelection('c', 'a');
  sandbox.syncLinkTabStop(canvas);
  assert.deepEqual(stops(links), ['-1', '-1', '0', '-1']);
  state.selection = NONE;
  run(sandbox, 'diagramLinkStop = null;');
  sandbox.syncLinkTabStop(canvas);
  assert.deepEqual(stops(links), ['0', '-1', '-1', '-1'], 'nothing selected: the first');
});

test('the link the focus last rested on stays the stop, over the selection, and a twin is told from its sibling', async () => {
  const links = [linkEl('a', 'b', 0), linkEl('a', 'b', 1), linkEl('b', 'a')];
  const { sandbox, state, canvas } = await pageWith(links);
  state.selection = linkSelection('b', 'a');
  run(sandbox, "diagramLinkStop = { link: true, from: 'a', to: 'b', nth: '1' };");
  sandbox.syncLinkTabStop(canvas);
  assert.deepEqual(stops(links), ['-1', '0', '-1'], 'the second twin, not the first and not the selected one');
});

test('the stop that disappears falls back: the selected pair, else the first link, and what is kept is a link the drawing has', async () => {
  const links = [linkEl('a', 'b'), linkEl('b', 'a')];
  const { sandbox, state, canvas } = await pageWith(links);
  run(sandbox, "diagramLinkStop = { link: true, from: 'x', to: 'y', nth: null };");
  state.selection = linkSelection('b', 'a');
  sandbox.syncLinkTabStop(canvas);
  assert.deepEqual(stops(links), ['-1', '0']);
  assert.deepEqual(plain(run(sandbox, 'diagramLinkStop')), { link: true, from: 'b', to: 'a', nth: null });
  run(sandbox, "diagramLinkStop = { link: true, from: 'x', to: 'y', nth: null };");
  state.selection = NONE;
  sandbox.syncLinkTabStop(canvas);
  assert.deepEqual(stops(links), ['0', '-1']);
  // a twin that is gone (the pair has fewer links now): the first link of its pair
  run(sandbox, "diagramLinkStop = { link: true, from: 'b', to: 'a', nth: '3' };");
  sandbox.syncLinkTabStop(canvas);
  assert.deepEqual(stops(links), ['-1', '0']);
});

test('a drawing without links has no stop, and forgets the old one', async () => {
  const { sandbox, canvas } = await pageWith([]);
  run(sandbox, "diagramLinkStop = { link: true, from: 'a', to: 'b', nth: null };");
  sandbox.syncLinkTabStop(canvas);
  assert.equal(run(sandbox, 'diagramLinkStop'), null);
  sandbox.syncLinkTabStop(null); // no canvas: nothing to do, no error
  sandbox.syncLinkTabStop({});
});

test('the focus moves the stop: a link that gets the focus becomes the only stop; a box does not touch it', async () => {
  const links = [linkEl('a', 'b'), linkEl('b', 'a'), linkEl('a', 'c')];
  const box = fakeEl('dg-node', { 'data-id': 'a', tabindex: '0' });
  const page = await pageWith(links, [box]);
  wireFocus(page, links.concat([box]));
  page.sandbox.syncLinkTabStop(page.canvas);
  assert.deepEqual(stops(links), ['0', '-1', '-1']);
  links[2].focus();
  assert.deepEqual(stops(links), ['-1', '-1', '0']);
  box.focus();
  assert.deepEqual(stops(links), ['-1', '-1', '0'], 'a box is not a link');
  assert.equal(box.attrs.tabindex, '0');
  assert.deepEqual(plain(run(page.sandbox, 'diagramLinkStop')), { link: true, from: 'a', to: 'c', nth: null });
});

test('the page runs the sync after the outlines and before the focus is given back, and every drawing goes through it', () => {
  const body = functionSource('showDiagramScene');
  const order = ['markLinkSelection();', 'syncLinkTabStop(canvas);', 'restoreDiagramFocus(canvas);'].map((call) => body.indexOf(call));
  assert.ok(order.every((i) => i > 0) && order[0] < order[1] && order[1] < order[2], 'markLinkSelection, then syncLinkTabStop, then restoreDiagramFocus');
});

test('a click on a link, or on its caption, moves the stop to that link even where the browser gives it no focus; an address forgets the stop', async () => {
  const links = [linkEl('customer', 'shop'), linkEl('shop', 'customer', 0), linkEl('shop', 'customer', 1)];
  const { sandbox, state } = await pageWith(links);
  sandbox.render = () => {};
  sandbox.document.getElementById = () => ({ getAttribute: () => null });
  const attributes = { 'data-action': 'select-link', 'data-from': 'shop', 'data-to': 'customer', 'data-nth': '1', 'data-layer': 'application' };
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
  assert.deepEqual(plain(run(sandbox, 'diagramLinkStop')), { link: true, from: 'shop', to: 'customer', nth: '1' });
  assert.equal(state.selection.kind, 'link');
  assert.ok(!JSON.stringify(state.selection).includes('"nth"'), 'the selection is still the pair: the position is the stop\'s, not the selection\'s');
  // an address names a link: the selected link, not where the focus was, is the stop then
  sandbox.currentPerspective = 'map';
  run(sandbox, "currentPerspective = 'map';");
  sandbox.location.hash = '#/map?link-from=customer&link-to=shop';
  sandbox.applySelectionFromHashRef();
  assert.equal(run(sandbox, 'diagramLinkStop'), null);
});

// ============================================================ the keys

/** A key pressed on `target` inside the diagram; `prevented` says whether the page swallowed it. */
function press(sandbox, target, key, extra) {
  const event = Object.assign({ key, target, prevented: false, preventDefault() { event.prevented = true; } }, extra);
  const stage = {};
  const inner = target.closest;
  target.closest = (selector) => (selector === '.diagram-stage' ? stage : selector === '#diagram-canvas' ? {} : inner(selector));
  sandbox.handleDiagramKeydown(event);
  target.closest = inner;
  return event;
}

test('on a link: right and down go to the next, left and up to the previous, Home and End to the ends, in drawing order', async () => {
  const log = [];
  const links = [linkEl('a', 'b', 0), linkEl('a', 'b', 1), linkEl('b', 'a'), linkEl('a', 'c')];
  const page = await pageWith(links);
  wireFocus(page, links, log);
  page.sandbox.syncLinkTabStop(page.canvas);
  const names = ['a>b#0', 'a>b#1', 'b>a', 'a>c'];
  const from = (index, key) => { log.length = 0; const event = press(page.sandbox, links[index], key); return { went: log.slice(), event }; };
  assert.deepEqual(from(0, 'ArrowRight').went, [names[1]]);
  assert.deepEqual(from(1, 'ArrowDown').went, [names[2]]);
  assert.deepEqual(from(2, 'ArrowLeft').went, [names[1]]);
  assert.deepEqual(from(2, 'ArrowUp').went, [names[1]]);
  assert.deepEqual(from(2, 'Home').went, [names[0]]);
  assert.deepEqual(from(1, 'End').went, [names[3]]);
  assert.deepEqual(stops(links), ['-1', '-1', '-1', '0'], 'and the stop is where the focus went');
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']) assert.ok(from(1, key).event.prevented, key + ' is swallowed: the canvas does not scroll');
});

test('at an end the link does not change and nothing wraps around, yet the press is swallowed', async () => {
  const log = [];
  const links = [linkEl('a', 'b'), linkEl('b', 'a')];
  const { sandbox, canvas } = await pageWith(links);
  links.forEach((el) => { el.focus = () => log.push(el.attrs['data-from']); });
  const last = press(sandbox, links[1], 'ArrowRight');
  const first = press(sandbox, links[0], 'ArrowUp');
  const home = press(sandbox, links[0], 'Home');
  const end = press(sandbox, links[1], 'End');
  assert.deepEqual(log, [], 'already there');
  assert.ok(last.prevented && first.prevented && home.prevented && end.prevented);
  assert.ok(canvas);
});

test('on a box nothing changed: the arrows go to the neighbouring box, Home and End are not taken, and a keyboard modifier is left alone', async () => {
  const link = linkEl('a', 'b');
  const box = fakeEl('dg-node', { 'data-id': 'a' });
  const neighbour = { focus() { neighbour.focused = true; } };
  const { sandbox } = await pageWith([link], [box]);
  sandbox.diagramNeighbor = (from, key) => (from === box ? neighbour : null);
  const arrow = press(sandbox, box, 'ArrowRight');
  assert.ok(arrow.prevented && neighbour.focused, 'the spatial model of the boxes');
  const home = press(sandbox, box, 'Home');
  assert.ok(!home.prevented, 'Home on a box is not a diagram key');
  neighbour.focused = false;
  const ctrl = press(sandbox, link, 'ArrowRight', { ctrlKey: true });
  assert.ok(!ctrl.prevented && !neighbour.focused, 'ctrl, meta and alt are the browser\'s');
});

test('the arrow keys no longer go from a link to a box: the old helper is gone, Tab leaves the group', async () => {
  assert.ok(!HTML.includes('diagramLinkStartOf'));
  const links = [linkEl('a', 'b'), linkEl('b', 'a')];
  const box = fakeEl('dg-node', { 'data-id': 'a' });
  const { sandbox } = await pageWith(links, [box]);
  let neighbourAsked = false;
  sandbox.diagramNeighbor = () => { neighbourAsked = true; return null; };
  press(sandbox, links[0], 'ArrowRight');
  assert.ok(!neighbourAsked);
});

test('Enter and Space still select a link and Escape still deselects it; the other keys of the diagram are untouched', () => {
  const body = functionSource('handleDiagramKeydown');
  assert.match(body, /e\.key === 'Enter' \|\| e\.key === ' '/);
  assert.match(body, /e\.key === 'Escape' && AppState\.selection\.kind === 'link'/);
  assert.match(body, /e\.key === '\+' \|\| e\.key === '='/);
  assert.ok(body.indexOf("e.key === 'Enter'") < body.indexOf("closest('.dg-link')"), 'Enter and Space are handled before the link keys');
});

// ============================================================ the focus after a redraw

test('the focus goes back to the same twin after the drawing is rebuilt, else the first link of the pair, else the canvas', async () => {
  const { sandbox } = await pageWith([]);
  const focusTarget = (nth) => sandbox.diagramFocusTargetOf({ closest: () => ({ classList: { contains: (c) => c === 'dg-link' }, getAttribute: (n) => ({ 'data-from': 'a', 'data-to': 'b', 'data-nth': nth })[n] }) });
  assert.deepEqual(plain(focusTarget('1')), { link: true, from: 'a', to: 'b', nth: '1' });
  assert.deepEqual(plain(focusTarget(undefined)), { link: true, from: 'a', to: 'b', nth: null });
  const focused = [];
  const mk = (from, to, nth) => { const el = linkEl(from, to, nth); el.focus = () => focused.push(from + '>' + to + (nth === null || nth === undefined ? '' : '#' + nth)); return el; };
  const restore = (wanted, links) => {
    focused.length = 0;
    const canvas = { contains: () => true, focus() { focused.push('canvas'); }, querySelectorAll: (selector) => (selector === '.dg-link' ? links : []) };
    run(sandbox, 'pendingDiagramFocus = ' + JSON.stringify(wanted) + ';');
    sandbox.restoreDiagramFocus(canvas);
    return focused.slice();
  };
  const twins = [mk('a', 'b', 0), mk('a', 'b', 1), mk('b', 'a')];
  assert.deepEqual(restore({ link: true, from: 'a', to: 'b', nth: '1' }, twins), ['a>b#1'], 'the second twin, not the first');
  assert.deepEqual(restore({ link: true, from: 'a', to: 'b', nth: '0' }, twins), ['a>b#0']);
  assert.deepEqual(restore({ link: true, from: 'b', to: 'a', nth: null }, twins), ['b>a'], 'a link on its own');
  assert.deepEqual(restore({ link: true, from: 'a', to: 'b', nth: '5' }, twins), ['a>b#0'], 'the twin is gone: the first of its pair');
  assert.deepEqual(restore({ link: true, from: 'a', to: 'b', nth: null }, [mk('a', 'b', 0), mk('a', 'b', 1)]), ['a>b#0'], 'it had no twin, it has two now');
  assert.deepEqual(restore({ link: true, from: 'x', to: 'y', nth: null }, twins), ['canvas'], 'the pair is gone: the canvas, as before');
  assert.deepEqual(restore({ link: true, from: 'a', to: 'b', nth: '1' }, [mk('a', 'b')]), ['a>b'], 'the pair is one link now');
});

test('a redraw keeps exactly one stop when the focus comes back to a twin', async () => {
  const links = [linkEl('a', 'b', 0), linkEl('a', 'b', 1), linkEl('b', 'a')];
  const page = await pageWith(links);
  wireFocus(page, links);
  run(page.sandbox, "pendingDiagramFocus = { link: true, from: 'a', to: 'b', nth: '1' };");
  page.sandbox.syncLinkTabStop(page.canvas);
  assert.deepEqual(stops(links), ['0', '-1', '-1'], 'the drawing was rebuilt: the stop is the first');
  page.sandbox.restoreDiagramFocus(page.canvas);
  assert.deepEqual(stops(links), ['-1', '0', '-1'], 'and the focus moves it to the twin it had');
});

// ============================================================ what the page says

test('the links sit in a group that says they are one tab stop, and the exported SVG drops what it says', async () => {
  const { sandbox } = await openFixture();
  const drawing = drawnWithTwins(sandbox);
  assert.equal((drawing.html.match(/<g class="dg-links" role="group" aria-label="Links: one tab stop, the arrow keys move between them">/g) || []).length, 1);
  const group = drawing.html.slice(drawing.html.indexOf('<g class="dg-links"'));
  assert.equal(group.slice(0, group.indexOf('<g class="dg-node')).match(/<g class="dg-link"/g).length, 4, 'all the links, and only them, are in the group');
  const empty = { items: [{ id: 'a', reference: 'a', parent: null }], links: [] };
  assert.ok(!sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(empty)), empty, '').html.includes('dg-links'), 'no links, no group');
  assert.doesNotMatch(functionSource('renderDiagramCanvasHtml'), /one tab stop/, 'the canvas, where the arrows go to boxes, does not say it');
  assert.match(functionSource('diagramExportDocument'), /querySelectorAll\('\.dg-links'\)\) \{ el\.removeAttribute\('role'\); el\.removeAttribute\('aria-label'\)/);
});

test('hover and focus still light the pair of a link, and a link still says it is pressed', () => {
  assert.match(functionSource('handleDiagramFocus'), /closest\('\.dg-node, \.dg-fold, \.dg-link'\)/);
  assert.match(functionSource('markLinkSelection'), /setAttribute\('aria-pressed', String\(selected\)\)/);
});
