'use strict';
// The boxes of a diagram are one tab stop (field check of wave 006, F-8: 13 boxes were 13 presses of Tab before the first field of the panel):
// a roving tabindex like the one of the links (diagram-link-tab-stops.test.js): `tabindex="0"` on one box, `-1` on the others, the arrow keys
// between boxes as before, the stop following the focus, the focus given back to the same box after a redraw. Same harness as that file: the
// drawing is built from the real kernel with a fake layout, the page is driven with fake elements that remember their attributes and their focus.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');

function fakeLayout(graph) {
  const place = (node, x) =>
    Object.assign({}, node, {
      x,
      y: 0,
      width: node.width || 400,
      height: node.height || 200,
      children: (node.children || []).map((child, i) => place(child, 10 + i * 20))
    });
  return Object.assign(place(graph, 0), { width: 900, height: 600, edges: [] });
}

/** The tag of every box of a drawing, in drawing order: { id, tabindex, ghost }. */
const boxesOf = (html) =>
  Array.from(html.matchAll(/<g class="dg-node([^"]*)"[^>]*? data-id="([^"]*)"[^>]*? tabindex="(-?\d)"/g), (m) => ({
    id: m[2],
    tabindex: m[3],
    ghost: m[1].includes('dg-ghost'),
    focal: m[1].includes('dg-focal')
  }));

async function draw(viewpoint, reference, opts) {
  const { sandbox, state, kernel } = await openFixture();
  run(sandbox, "currentPerspective = 'elements';");
  const result = kernel.compute(sandbox.buildKernelInput(viewpoint, reference).input);
  return {
    sandbox,
    state,
    result,
    html: sandbox.renderDiagramSvg(
      fakeLayout(sandbox.buildElkGraph(result)),
      result,
      opts && opts.focal !== undefined ? opts.focal : reference,
      (opts && opts.options) || {}
    ).html
  };
}

// ============================================================ the markup

test('a drawing has one box with the tab stop: the focal one, and every other box has none', async () => {
  const { html } = await draw('deep', 'shop');
  const boxes = boxesOf(html);
  assert.ok(boxes.length > 8, 'a drawing with many boxes');
  assert.deepEqual(
    boxes.filter((b) => b.tabindex === '0').map((b) => b.id),
    ['shop'],
    'the focal box'
  );
  assert.ok(boxes.filter((b) => b.tabindex === '-1').length === boxes.length - 1);
  // what a box was is still there: a link to its element, named, reachable by the arrow keys
  assert.ok((html.match(/<g class="dg-node[^>]*role="link"[^>]*aria-label="[^"]+"/g) || []).length === boxes.length);
});

test('with no focal box (the Map) the first box drawn is the stop', async () => {
  const { html } = await draw('deep', 'shop', { focal: '' });
  const boxes = boxesOf(html);
  assert.equal(boxes.filter((b) => b.tabindex === '0').length, 1);
  assert.equal(boxes[0].tabindex, '0', 'the first drawn (the boxes that contain others come first)');
});

test('a ghost box keeps its own stop and is not the stop of the others', async () => {
  const { sandbox } = await openFixture();
  const result = {
    items: [
      { id: 'a', reference: 'a', parent: null },
      { id: 'b', reference: 'b', parent: null },
      { id: 'ghost_x', reference: 'ghost_x', ghost: true, owner: 'a', parent: null }
    ],
    links: []
  };
  const html = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '').html;
  assert.deepEqual(
    boxesOf(html).map((b) => b.id + ':' + b.tabindex),
    ['a:0', 'b:-1', 'ghost_x:0'],
    'one stop among the real boxes, and the ghost, which is not part of them'
  );
});

// ============================================================ which box is the stop

function fakeBox(id, classes) {
  const attrs = { 'data-id': id, tabindex: '-1' };
  const set = new Set(['dg-node'].concat(classes || []));
  return {
    attrs,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: (name, value) => {
      attrs[name] = String(value);
    },
    classList: { contains: (c) => set.has(c), add: (c) => set.add(c), remove: (c) => set.delete(c) },
    closest: (selector) =>
      (selector.split(',').some((part) => set.has(part.trim().replace(/^.*\./, ''))) ? undefined : null) || null
  };
}
const stops = (boxes) => boxes.map((b) => b.attrs.tabindex);

async function pageWith(boxes) {
  const { sandbox } = await openFixture();
  const canvas = {
    querySelectorAll: (selector) => (selector === '.dg-node' ? boxes : []),
    contains: () => true,
    focus() {}
  };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  sandbox.document.querySelectorAll = (selector) => (selector === '#diagram-canvas .dg-node' ? boxes : []);
  sandbox.document.querySelector = () => null;
  sandbox.revealDiagramNode = () => {};
  run(sandbox, 'diagramNodeStop = null;');
  return { sandbox, canvas };
}

test('the stop is the box the focus last rested on, else the selected one, else the focal one, else the first; the others have none', async () => {
  const boxes = [fakeBox('a'), fakeBox('b', ['dg-focal']), fakeBox('c', ['dg-selected']), fakeBox('d')];
  const { sandbox, canvas } = await pageWith(boxes);
  sandbox.syncNodeTabStop(canvas);
  assert.deepEqual(stops(boxes), ['-1', '-1', '0', '-1'], 'the selected box, over the focal one');
  boxes[2].classList.remove('dg-selected');
  run(sandbox, 'diagramNodeStop = null;');
  sandbox.syncNodeTabStop(canvas);
  assert.deepEqual(stops(boxes), ['-1', '0', '-1', '-1'], 'the focal one');
  boxes[1].classList.remove('dg-focal');
  run(sandbox, 'diagramNodeStop = null;');
  sandbox.syncNodeTabStop(canvas);
  assert.deepEqual(stops(boxes), ['0', '-1', '-1', '-1'], 'the first');
  run(sandbox, "diagramNodeStop = 'd';");
  sandbox.syncNodeTabStop(canvas);
  assert.deepEqual(stops(boxes), ['-1', '-1', '-1', '0'], 'the one the focus was on, over everything');
  run(sandbox, "diagramNodeStop = 'gone';");
  sandbox.syncNodeTabStop(canvas);
  assert.deepEqual(
    stops(boxes),
    ['0', '-1', '-1', '-1'],
    'a box the drawing has not any more: the fallback, and what is kept is a box it has'
  );
  assert.equal(run(sandbox, 'diagramNodeStop'), 'a');
});

test('a ghost box is left out of the roving stop, and a drawing with no box has none and forgets the old one', async () => {
  const boxes = [fakeBox('ghost', ['dg-ghost']), fakeBox('a')];
  boxes[0].attrs.tabindex = '0';
  const { sandbox, canvas } = await pageWith(boxes);
  sandbox.syncNodeTabStop(canvas);
  assert.deepEqual(stops(boxes), ['0', '0'], 'the ghost was not touched, and the real box is the stop');
  const empty = await pageWith([]);
  run(empty.sandbox, "diagramNodeStop = 'a';");
  empty.sandbox.syncNodeTabStop(empty.canvas);
  assert.equal(run(empty.sandbox, 'diagramNodeStop'), null);
  empty.sandbox.syncNodeTabStop(null);
  empty.sandbox.syncNodeTabStop({});
});

test('the focus moves the stop: a box that gets the focus becomes the only stop; a ghost, a link and a fold button do not touch it', async () => {
  const boxes = [fakeBox('a'), fakeBox('b'), fakeBox('c')];
  const ghost = fakeBox('g', ['dg-ghost']);
  const { sandbox, canvas } = await pageWith(boxes);
  const focus = (el) => {
    el.closest = (selector) =>
      selector === '#diagram-canvas'
        ? canvas
        : selector.split(',').some((part) => el.classList.contains(part.trim().replace(/^.*\./, '')))
          ? el
          : null;
    sandbox.handleDiagramFocus({ type: 'focusin', target: el });
  };
  sandbox.syncNodeTabStop(canvas);
  assert.deepEqual(stops(boxes), ['0', '-1', '-1']);
  focus(boxes[2]);
  assert.deepEqual(stops(boxes), ['-1', '-1', '0']);
  assert.equal(run(sandbox, 'diagramNodeStop'), 'c');
  focus(ghost);
  assert.deepEqual(stops(boxes), ['-1', '-1', '0'], 'a ghost is not one of the boxes');
});

test('the page runs the sync with the other stops, after the outlines and before the focus is given back', () => {
  const body = HTML.slice(
    HTML.indexOf('function showDiagramScene('),
    HTML.indexOf('\n}\n', HTML.indexOf('function showDiagramScene('))
  );
  const order = [
    'markMapSelection();',
    'syncLinkTabStop(canvas);',
    'syncNodeTabStop(canvas);',
    'restoreDiagramFocus(canvas);'
  ].map((call) => body.indexOf(call));
  assert.ok(
    order.every((i) => i > 0) && order.every((i, k) => k === 0 || order[k - 1] < i),
    'selection outline, links, boxes, then the focus'
  );
});

// ============================================================ what did not change

test('the arrow keys still go to the neighbouring box and Enter still opens it, from a box that is not a tab stop', async () => {
  const boxes = [fakeBox('a'), fakeBox('b')];
  const { sandbox, canvas } = await pageWith(boxes);
  sandbox.syncNodeTabStop(canvas);
  assert.equal(boxes[1].attrs.tabindex, '-1');
  const focused = [];
  sandbox.diagramNeighbor = (from, key) =>
    from === boxes[0] && key === 'ArrowRight'
      ? Object.assign(boxes[1], {
          focus() {
            focused.push('b');
          }
        })
      : null;
  const stage = {};
  const key = (target, name) => {
    const event = {
      key: name,
      target,
      prevented: false,
      preventDefault() {
        event.prevented = true;
      }
    };
    const inner = target.closest;
    target.closest = (selector) =>
      selector === '.diagram-stage'
        ? stage
        : selector === '#diagram-canvas'
          ? canvas
          : selector === '.dg-link'
            ? null
            : selector === '[data-action]'
              ? null
              : inner(selector);
    sandbox.handleDiagramKeydown(event);
    target.closest = inner;
    return event;
  };
  boxes[0].closest.length; // the arrow works from a box whatever its tabindex
  sandbox.diagramNodeOf = (el) => el;
  const arrow = key(boxes[0], 'ArrowRight');
  assert.ok(
    arrow.prevented && focused.length === 1,
    'the arrow goes to the next box, which has tabindex -1 and takes the focus all the same'
  );
  assert.match(HTML, /e\.key\.startsWith\('Arrow'\)[\s\S]{0,200}diagramNeighbor\(current, e\.key\)/);
  assert.match(HTML, /e\.key === 'Enter' \|\| e\.key === ' '[\s\S]{0,300}dispatchEvent\(new MouseEvent\('click'/);
});

test('after a redraw the focus goes back to the same box, whatever its tabindex, and moves the stop there', async () => {
  const boxes = [fakeBox('a'), fakeBox('b'), fakeBox('c')];
  const { sandbox, canvas } = await pageWith(boxes);
  const focused = [];
  for (const box of boxes) {
    box.focus = () => {
      focused.push(box.attrs['data-id']);
      box.closest = (selector) =>
        selector === '#diagram-canvas'
          ? canvas
          : selector.split(',').some((part) => box.classList.contains(part.trim().replace(/^.*\./, '')))
            ? box
            : null;
      sandbox.handleDiagramFocus({ type: 'focusin', target: box });
    };
  }
  canvas.querySelectorAll = (selector) => (selector === '.dg-node' ? boxes : []);
  sandbox.syncNodeTabStop(canvas);
  assert.deepEqual(stops(boxes), ['0', '-1', '-1'], 'the drawing was rebuilt: the stop is the first');
  run(sandbox, "pendingDiagramFocus = { fold: false, id: 'c' };");
  sandbox.restoreDiagramFocus(canvas);
  assert.deepEqual(focused, ['c']);
  assert.deepEqual(stops(boxes), ['-1', '-1', '0'], 'and the focus moves the stop to it');
});

test('the exported SVG has no tab stop of any box, and the fold buttons keep theirs', () => {
  assert.match(
    HTML,
    /for \(const el of clone\.querySelectorAll\('\[tabindex\],\[data-action\]'\)\) \{\s*el\.removeAttribute\('tabindex'\)/
  );
  assert.match(
    HTML,
    /class="dg-fold"[^;]*tabindex="0" role="button"/,
    'a fold button is a button: its own stop, on the Map'
  );
});
