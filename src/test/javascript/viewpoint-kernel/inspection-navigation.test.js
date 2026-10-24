'use strict';
// Navigation from the inspection panel (run 0024, TDD-0024): the declaring element of a relationship as a button, a selected
// link in the address (`link-from=` / `link-to=`), the pan that brings a selected link into view, parallel links told apart
// in the panel, and the stereotype badges in the header of an element. The harness has no DOM and no layout engine: the
// drawing is built from the real kernel and a fake layout, the page is driven with fake elements. The look, and the pan in a
// real canvas, are checked in a browser.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS_NO_COMMENTS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const NONE = { kind: 'none', key: null, mode: 'view' };
const plain = (value) => JSON.parse(JSON.stringify(value));

function fakeLayout(graph) {
  const place = (node, x) =>
    Object.assign({}, node, {
      x,
      y: 0,
      width: node.width || 400,
      height: node.height || 200,
      children: (node.children || []).map((child, i) => place(child, 10 + i * 20))
    });
  return Object.assign(place(graph, 0), {
    width: 900,
    height: 600,
    edges: graph.edges.map((edge) =>
      Object.assign({}, edge, {
        sections: [{ startPoint: { x: 1, y: 1 }, bendPoints: [{ x: 5, y: 1 }], endPoint: { x: 9, y: 9 } }],
        labels: (edge.labels || []).map((label) => Object.assign({ x: 3, y: 3 }, label))
      })
    )
  });
}

/** A drawing of the fixture, as the page draws it, put on screen as the scene `showDiagramScene` would hold. */
async function page(perspective, viewpoint, reference) {
  const { sandbox, state, kernel } = await openFixture();
  const map = perspective === 'map';
  run(
    sandbox,
    "currentPerspective = '" +
      perspective +
      "'; elementTab = '" +
      (map ? 'overview' : viewpoint) +
      "'; diagramMaximized = false;"
  );
  if (!map) state.selection = { kind: 'element', key: reference, mode: 'view' };
  const result = kernel.compute(sandbox.buildKernelInput(viewpoint, reference, { layer: 'application' }).input);
  const ghosts = sandbox.buildDiagramGhosts(result, map ? null : reference, 'application');
  const drawn = { items: result.items.concat(ghosts.items), links: result.links.concat(ghosts.links) };
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(drawn)), drawn, map ? '' : reference, {
    map,
    layer: 'application',
    opened: [],
    pinned: []
  });
  const scene = {
    viewKey: map ? 'map|map||' : reference + '|' + viewpoint,
    html: drawing.html,
    hasSvg: true,
    links: drawing.links,
    boxes: drawing.boxes,
    drawnIds: new Set(Object.keys(drawing.boxes)),
    status: '',
    legend: '',
    width: drawing.width,
    height: drawing.height,
    focal: null
  };
  const show = (shown) => {
    sandbox.__scene = shown || scene;
    run(sandbox, 'diagramScene = __scene;');
  };
  show();
  return {
    sandbox,
    state,
    kernel,
    drawing,
    scene,
    show,
    regions: () => (map ? sandbox.renderMapPerspectiveHtml() : sandbox.renderElementsPerspectiveHtml())
  };
}

const linkSelection = (from, to, extra) =>
  Object.assign({ kind: 'link', key: from + ' -> ' + to, from, to, layer: 'application', mode: 'view' }, extra);

function fakePanel(sandbox, removed) {
  sandbox.document.querySelector = (selector) => (selector === '.inspection' ? { outerHTML: 'old' } : null);
  sandbox.document.querySelectorAll = (selector) => {
    if (selector === '#panel-right, [data-resize="panel-right"]')
      return [
        {
          remove() {
            removed.push('panel');
          }
        },
        {
          remove() {
            removed.push('handle');
          }
        }
      ];
    return [];
  };
}

/** A click as handleAppClick reads it: the nearest data-action element, with these attributes. */
function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({
    target: { closest: (selector) => (selector === '[data-action]' ? target : null) },
    preventDefault() {},
    stopPropagation() {},
    detail: 1
  });
}

/** The data-* attributes of the first element of `html` that opens with `tag` and has `needle` in its opening tag. */
function attributesOf(html, needle) {
  const tag = html.match(new RegExp('<[a-z]+[^>]*' + needle + '[^>]*>'))[0];
  const attrs = {};
  for (const m of tag.matchAll(/([a-z-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

/** Two links from `a` to `b`, one back, and a node each: two parallel links in one pair. */
function twinsResult(sandbox, relationshipsOfFirst, relationshipsOfSecond) {
  const rel = (label, tags) => ({ from: 'a', destination: 'b', label, qualifiers: [], tags: tags || {} });
  return {
    items: [
      { id: 'a', reference: 'a', parent: null },
      { id: 'b', reference: 'b', parent: null }
    ],
    links: [
      {
        from: 'a',
        to: 'b',
        label: 'one',
        qualifiers: [],
        tags: {},
        synthetic: false,
        secondary: false,
        relationships: relationshipsOfFirst || [rel('one')]
      },
      {
        from: 'a',
        to: 'b',
        label: 'two',
        qualifiers: [],
        tags: {},
        synthetic: false,
        secondary: false,
        relationships: relationshipsOfSecond || [rel('two')]
      },
      {
        from: 'b',
        to: 'a',
        label: 'back',
        qualifiers: [],
        tags: {},
        synthetic: false,
        secondary: false,
        relationships: []
      }
    ]
  };
}

// ============================================================ 1. the declaring element of a relationship

test('each relationship of the link panel offers its declaring element as a button that does what a box does', async () => {
  const { regions, state } = await page('elements', 'overview', 'shop.web.api');
  state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  const right = regions().right;
  const attrs = attributesOf(right, 'class="relationship-link"');
  assert.equal(attrs['data-action'], 'goto-element', 'the action of a box, not a new one');
  assert.equal(attrs['data-ref'], 'shop.web.frontend');
  assert.equal(attrs['data-layer'], 'application', 'with the layer of the drawing');
  assert.match(
    right,
    /<button type="button" class="relationship-link"[^>]*>shop\.web\.frontend<\/button> &rarr; shop\.web\.api<\/div>/,
    'a native button around the declaring element; the destination is text'
  );
});

test('the declaring button has an accessible name that contains its visible text, and says what it does', async () => {
  const { regions, state } = await page('elements', 'overview', 'shop.web.api');
  state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  const attrs = attributesOf(regions().right, 'class="relationship-link"');
  assert.match(attrs['aria-label'], /^Open shop\.web\.frontend, the element that declares this relationship$/);
  assert.ok(attrs['aria-label'].includes('shop.web.frontend'), 'the name contains the visible text');
  assert.ok(attrs.title, 'and there is a tooltip');
});

test('a click on it selects the element in the layer of the drawing, as a click on its box does', async () => {
  const { sandbox, state, regions } = await page('elements', 'overview', 'shop.web.api');
  sandbox.render = () => {};
  state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  const attrs = attributesOf(regions().right, 'class="relationship-link"');
  click(sandbox, attrs);
  assert.deepEqual(plain(state.selection), {
    kind: 'element',
    key: 'shop.web.frontend',
    layer: 'application',
    mode: 'view'
  });
  assert.ok(state.expanded.has('application:shop.web'), 'and its branch is unfolded in the tree, as for any jump');
});

test('on the Map the click goes through the same case: the framing is pinned first', async () => {
  const { sandbox, state, regions } = await page('map', 'map', null);
  sandbox.render = () => {};
  const taken = [];
  sandbox.takeOverDiagramFraming = (canvas) => taken.push(canvas);
  const canvas = { getAttribute: () => null };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  run(sandbox, "diagramScale = 'auto';");
  state.selection = linkSelection('customer', 'shop');
  click(sandbox, attributesOf(regions().right, 'class="relationship-link"'));
  assert.deepEqual(taken, [canvas]);
  assert.equal(state.selection.kind, 'element');
  assert.equal(state.selection.key, 'customer');
});

test('every declaring element of a link that groups several relationships is a button, also inside a folded box', async () => {
  const { regions, state } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  const right = regions().right;
  assert.equal((right.match(/class="relationship-link"/g) || []).length, 2);
  assert.ok(right.includes('data-ref="customer"'));
});

test("an element the drawing's layer does not have stays readable text, quoted", async () => {
  const { sandbox } = await openFixture();
  assert.equal(
    sandbox.renderDeclaringElementHtml('shop.web.api', 'technology'),
    'shop.web.api',
    'the environment has no such element: nothing to open'
  );
  assert.equal(sandbox.renderDeclaringElementHtml('a"<b>', 'application'), 'a&quot;&lt;b&gt;');
  assert.match(
    sandbox.renderDeclaringElementHtml('shop.web.api', 'application'),
    /^<button type="button" class="relationship-link" data-action="goto-element"/
  );
  // and what a reference holds never reaches the markup unquoted, in the attributes or in the text
  sandbox.layerOfReference = () => 'application';
  const odd = sandbox.renderDeclaringElementHtml('a"<b>&', 'application');
  assert.ok(
    odd.includes('data-ref="a&quot;&lt;b&gt;&amp;"') &&
      odd.includes('>a&quot;&lt;b&gt;&amp;</button>') &&
      odd.includes('Open a&quot;&lt;b&gt;&amp;,'),
    odd
  );
  assert.ok(!odd.includes('<b>'));
});

// ============================================================ 2. the link in the address

test('the address says the pair of boxes, quoted, after the other parameters of the perspective', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  assert.equal(sandbox.currentRouteHash(), '/timeline/applications?link-from=customer&link-to=shop');
  run(sandbox, "mapPinned = ['shop.web']; diagramFacet = null;");
  assert.equal(sandbox.currentRouteHash(), '/timeline/applications?pin=shop.web&link-from=customer&link-to=shop');
  // an id of the drawing can hold any character: two parameters, each quoted, no separator to get wrong
  state.selection = linkSelection('ghost:a b&c=d', 'x>y,z');
  const hash = sandbox.currentRouteHash();
  assert.ok(hash.endsWith('&link-from=ghost%3Aa%20b%26c%3Dd&link-to=x%3Ey%2Cz'), hash);
  run(sandbox, 'mapPinned = [];');
  sandbox.location.hash = '#' + sandbox.currentRouteHash();
  assert.deepEqual(
    plain(sandbox.linkFromHash()),
    { from: 'ghost:a b&c=d', to: 'x>y,z' },
    'and reads back as it was written'
  );
});

test('in Elements the address keeps the element and its tab and adds the link', async () => {
  const { sandbox, state } = await page('elements', 'overview', 'shop.web.api');
  state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  assert.equal(
    sandbox.currentRouteHash(),
    '/timeline/elements?ref=shop.web.api&tab=overview&link-from=shop.web.frontend&link-to=shop.web.api'
  );
});

test('the address is written before a change of perspective is drawn: a link that cannot live in the new place is left out', async () => {
  const map = await page('map', 'map', null);
  map.state.selection = linkSelection('customer', 'shop');
  run(map.sandbox, "currentPerspective = 'elements';"); // setPerspective() writes the address, then render() ends the link
  assert.equal(map.sandbox.currentRouteHash(), '/timeline/elements', 'a Map link says nothing about Elements');
  const elements = await page('elements', 'overview', 'shop.web.api');
  elements.state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  run(elements.sandbox, "elementTab = 'details';");
  assert.equal(
    elements.sandbox.currentRouteHash(),
    '/timeline/elements?ref=shop.web.api',
    'Details has no diagram, so no link'
  );
  run(elements.sandbox, "elementTab = 'overview'; currentPerspective = 'map';");
  assert.ok(
    !elements.sandbox.currentRouteHash().includes('link-'),
    "nor does the Map take the link of an element's diagram"
  );
});

test('the guard is the state, not the caller: the other places that write the address before drawing leave a leftover link out', async () => {
  // goToStoryStep, openSavedView, library-tab and setPerspective all write currentRouteHash() before render() has settled the selection
  const { sandbox, state } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  run(sandbox, "currentPerspective = 'library'; libraryTab = 'views';");
  assert.ok(!sandbox.currentRouteHash().includes('link-'), 'the Library has no diagram');
  assert.equal(sandbox.linkInRoute(), null);
  run(sandbox, "currentPerspective = 'map';");
  assert.equal(
    sandbox.linkInRoute().from,
    'customer',
    'on the Map a link that is still selected is in the address, as a view or a step opened on the Map leaves it (the next drawing drops it if it lacks the pair)'
  );
});

test('an address with a link selects it on the Map, as a click would, and brings it into view', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  state.selection = NONE;
  sandbox.location.hash = '#/timeline/applications?link-from=customer&link-to=shop';
  sandbox.applySelectionFromHashRef();
  assert.deepEqual(plain(state.selection), linkSelection('customer', 'shop'));
  assert.deepEqual(
    plain(run(sandbox, 'revealLinkAfterDrawing')),
    { nth: null },
    'which twin is not in an address: the first'
  );
  // the link wins over the element that `ref=` named: a selection is one thing
  sandbox.location.hash = '#/timeline/applications?ref=shop.web&link-from=customer&link-to=shop';
  sandbox.applySelectionFromHashRef();
  assert.equal(state.selection.kind, 'link');
});

test('an address with a link selects it over the element of a diagram tab in Elements, with its layer', async () => {
  const { sandbox, state } = await page('elements', 'overview', 'shop.web.api');
  state.selection = NONE;
  sandbox.location.hash =
    '#/timeline/elements?ref=shop.web.api&tab=overview&link-from=shop.web.frontend&link-to=shop.web.api';
  sandbox.applySelectionFromHashRef();
  assert.deepEqual(
    plain(state.selection),
    linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' })
  );
  assert.deepEqual(
    plain(sandbox.elementSelection()),
    { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' },
    'the element stays the subject'
  );
});

test('where a link cannot be selected the parameters are ignored: Details, an unknown element, no element, the Library', async () => {
  const { sandbox, state } = await page('elements', 'overview', 'shop.web.api');
  const read = (hash) => {
    state.selection = NONE;
    sandbox.location.hash = hash;
    sandbox.applySelectionFromHashRef();
    return plain(state.selection);
  };
  const link = '&link-from=shop.web.frontend&link-to=shop.web.api';
  assert.deepEqual(
    read('#/timeline/elements?ref=shop.web.api' + link),
    { kind: 'element', key: 'shop.web.api', mode: 'view' },
    'Details has no diagram'
  );
  assert.deepEqual(read('#/timeline/elements?ref=nope&tab=overview' + link), NONE);
  assert.deepEqual(read('#/timeline/elements?tab=overview' + link), NONE, 'no element to be about');
  assert.deepEqual(read('#/stories/views?x=1' + link), NONE);
  assert.equal(run(sandbox, 'revealLinkAfterDrawing'), false, 'and nothing is brought into view');
});

test('half a link, an empty one or a broken quoting names nothing, and does no harm', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  for (const hash of [
    '#/timeline/applications?link-from=customer',
    '#/timeline/applications?link-to=shop',
    '#/timeline/applications?link-from=&link-to=shop',
    '#/timeline/applications?link-from=customer&link-to=',
    '#/timeline/applications?link-from=%E0%A4%A&link-to=%',
    '#/timeline/applications?link-from',
    '#/timeline/applications?'
  ]) {
    state.selection = NONE;
    sandbox.location.hash = hash;
    sandbox.applySelectionFromHashRef();
    assert.ok(state.selection.kind === 'none' || state.selection.kind === 'link', hash + ' does not throw');
    if (!/link-from=%E0/.test(hash)) assert.deepEqual(plain(state.selection), NONE, hash + ' selects nothing');
  }
});

test('an address with no link parameter reads exactly as it did', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  sandbox.location.hash = '#/timeline/applications?ref=shop.web&pin=shop.web';
  sandbox.applySelectionFromHashRef();
  assert.deepEqual(plain(state.selection), { kind: 'element', key: 'shop.web', mode: 'view' });
  assert.equal(run(sandbox, 'revealLinkAfterDrawing'), false);
});

test('a link of the address that the drawing does not have is dropped when the drawing arrives, and the address is cleaned', async () => {
  const { sandbox, state, show, scene } = await page('map', 'map', null);
  state.selection = NONE;
  sandbox.location.hash = '#/timeline/applications?link-from=customer&link-to=nowhere';
  sandbox.applySelectionFromHashRef();
  assert.equal(state.selection.kind, 'link', 'until the drawing says otherwise, the panel waits');
  assert.match(sandbox.renderMapPerspectiveHtml().right, /Reading the link/);
  const removed = [];
  fakePanel(sandbox, removed);
  show(scene);
  sandbox.reconcileLinkSelection();
  assert.deepEqual(plain(state.selection), NONE);
  assert.equal(sandbox.location.hash, '#/timeline/applications', 'the address no longer names it');
  assert.deepEqual(removed, ['panel', 'handle']);
});

test('a link of the address that the drawing has is kept, with its panel, and stays in the address', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  state.selection = NONE;
  sandbox.location.hash = '#/timeline/applications?link-from=customer&link-to=shop';
  sandbox.applySelectionFromHashRef();
  const holder = { outerHTML: 'old' };
  sandbox.document.querySelector = (selector) => (selector === '.inspection' ? holder : null);
  sandbox.reconcileLinkSelection();
  assert.equal(state.selection.kind, 'link');
  assert.match(holder.outerHTML, /2 relationships are grouped/);
  assert.equal(sandbox.location.hash, '#/timeline/applications?link-from=customer&link-to=shop');
});

test('in Elements a link the diagram lacks gives the element back and cleans the address', async () => {
  const { sandbox, state, show, scene } = await page('elements', 'overview', 'shop.web.api');
  state.selection = NONE;
  sandbox.location.hash = '#/timeline/elements?ref=shop.web.api&tab=overview&link-from=shop.web.frontend&link-to=gone';
  sandbox.applySelectionFromHashRef();
  fakePanel(sandbox, []);
  show(scene);
  sandbox.reconcileLinkSelection();
  assert.deepEqual(plain(state.selection), {
    kind: 'element',
    key: 'shop.web.api',
    layer: 'application',
    mode: 'view'
  });
  assert.equal(sandbox.location.hash, '#/timeline/elements?ref=shop.web.api&tab=overview');
});

test('what is written is what is read, on the Map and in Elements', async () => {
  const map = await page('map', 'map', null);
  map.state.selection = linkSelection('customer', 'shop');
  map.sandbox.location.hash = '#' + map.sandbox.currentRouteHash();
  map.state.selection = NONE;
  map.sandbox.applySelectionFromHashRef();
  assert.deepEqual(plain(map.state.selection), linkSelection('customer', 'shop'));
  const el = await page('elements', 'overview', 'shop.web.api');
  const selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  el.state.selection = selection;
  el.sandbox.location.hash = '#' + el.sandbox.currentRouteHash();
  el.state.selection = NONE;
  el.sandbox.applySelectionFromHashRef();
  assert.deepEqual(plain(el.state.selection), selection);
});

test('selecting a link rewrites the current entry of the history and adds none; the address has it at once', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  const pushes = [];
  sandbox.history.pushState = (...args) => pushes.push(args);
  sandbox.render = () => {
    sandbox.syncHashFromState();
  }; // what the end of render() does
  state.selection = NONE;
  click(sandbox, {
    'data-action': 'select-link',
    'data-from': 'customer',
    'data-to': 'shop',
    'data-layer': 'application'
  });
  assert.deepEqual(pushes, []);
  assert.equal(sandbox.location.hash, '#/timeline/applications?link-from=customer&link-to=shop');
});

test('Back from an element opened through the declaring button returns to the link', async () => {
  const { sandbox, state, regions } = await page('map', 'map', null);
  const entries = [];
  sandbox.history.pushState = (s, t, url) => entries.push(url);
  Object.defineProperty(sandbox.location, 'href', {
    get: () => 'http://localhost/editor.html' + sandbox.location.hash
  });
  sandbox.render = () => {
    sandbox.syncHashFromState();
  };
  state.selection = linkSelection('customer', 'shop');
  sandbox.syncHashFromState();
  click(sandbox, attributesOf(regions().right, 'class="relationship-link"'));
  assert.equal(entries.length, 1, 'one entry, the place that is left');
  assert.ok(entries[0].endsWith('#/timeline/applications?link-from=customer&link-to=shop'), 'with the link in it');
  assert.equal(sandbox.location.hash, '#/timeline/applications?ref=customer', 'and the new place is the element');
  // Back: the browser puts the old address back and fires hashchange
  sandbox.location.hash = entries[0].slice(entries[0].indexOf('#'));
  sandbox.__windowListeners.hashchange[0]();
  assert.deepEqual(plain(state.selection), linkSelection('customer', 'shop'));
});

test('hashchange applies a link that changed and leaves one the page wrote itself alone', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  const renders = { n: 0 };
  sandbox.render = () => {
    renders.n++;
  };
  const listener = sandbox.__windowListeners.hashchange[0];
  state.selection = linkSelection('customer', 'shop');
  sandbox.location.hash = '#' + sandbox.currentRouteHash();
  listener();
  assert.equal(renders.n, 0, 'the state already is what the address says');
  sandbox.location.hash = '#/timeline/applications?link-from=mailer&link-to=customer';
  listener();
  assert.equal(renders.n, 1);
  assert.deepEqual(plain(state.selection), linkSelection('mailer', 'customer'));
  sandbox.location.hash = '#/timeline/applications';
  listener();
  assert.deepEqual(plain(state.selection), NONE, 'Back to an entry without the link');
});

// ============================================================ 3. bringing the selected link into view

const fakeLinkEl = (from, to, extra) =>
  Object.assign(
    {
      from,
      to,
      getAttribute(name) {
        return { 'data-from': from, 'data-to': to }[name] || null;
      }
    },
    extra
  );
const canvasOf = (links) => ({ querySelectorAll: (selector) => (selector === '.dg-link' ? links : []) });

test('a click on a link of the Map asks for the link to be brought into view once the drawing is there; one in Elements does not', async () => {
  const map = await page('map', 'map', null);
  map.sandbox.render = () => {};
  map.sandbox.document.getElementById = () => ({ getAttribute: () => null });
  click(map.sandbox, {
    'data-action': 'select-link',
    'data-from': 'customer',
    'data-to': 'shop',
    'data-layer': 'application'
  });
  assert.deepEqual(plain(run(map.sandbox, 'revealLinkAfterDrawing')), { nth: null });
  click(map.sandbox, {
    'data-action': 'select-link',
    'data-from': 'customer',
    'data-to': 'shop',
    'data-nth': '1',
    'data-layer': 'application'
  });
  assert.deepEqual(
    plain(run(map.sandbox, 'revealLinkAfterDrawing')),
    { nth: 1 },
    'a click on a twin remembers which one'
  );
  const el = await page('elements', 'overview', 'shop.web.api');
  el.sandbox.render = () => {};
  el.sandbox.document.getElementById = () => ({ getAttribute: (n) => (n === 'data-ref' ? 'shop.web.api' : null) });
  click(el.sandbox, {
    'data-action': 'select-link',
    'data-from': 'shop.web.frontend',
    'data-to': 'shop.web.api',
    'data-layer': 'application'
  });
  assert.equal(
    run(el.sandbox, 'revealLinkAfterDrawing'),
    false,
    'the panel was already there: nothing narrowed the canvas'
  );
});

test('the pan happens once, for the selected link, through the existing reveal; a redraw later does not move the view', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  const seen = [];
  sandbox.revealDiagramNode = (node) => seen.push(node);
  const other = fakeLinkEl('mailer', 'customer');
  const wanted = fakeLinkEl('customer', 'shop');
  state.selection = linkSelection('customer', 'shop');
  run(sandbox, 'revealLinkAfterDrawing = { nth: null };');
  sandbox.revealSelectedLink(canvasOf([other, wanted]));
  assert.deepEqual(seen, [wanted]);
  assert.equal(run(sandbox, 'revealLinkAfterDrawing'), false, 'consumed');
  sandbox.revealSelectedLink(canvasOf([other, wanted])); // the next drawing (a facet, a fold)
  assert.equal(seen.length, 1, 'a link selected for a while is not brought back');
});

test('with several links between the two boxes the one that was clicked is brought into view, even when twins carry the same relationships', async () => {
  const { sandbox, state } = await openFixture();
  const seen = [];
  sandbox.revealDiagramNode = (node) => seen.push(node);
  const twin = (nth) =>
    fakeLinkEl('a', 'b', {
      getAttribute(name) {
        return { 'data-from': 'a', 'data-to': 'b', 'data-nth': String(nth) }[name] || null;
      }
    });
  const [first, second] = [twin(0), twin(1)];
  state.selection = linkSelection('a', 'b');
  run(sandbox, 'revealLinkAfterDrawing = { nth: 1 };');
  sandbox.revealSelectedLink(canvasOf([first, second]));
  assert.deepEqual(
    seen,
    [second],
    'the position of the click, not a match on what the links say: identical twins have the same relationships'
  );
  run(sandbox, 'revealLinkAfterDrawing = { nth: null };');
  sandbox.revealSelectedLink(canvasOf([first, second]));
  assert.deepEqual(seen, [second, first], 'an address does not say which: the first');
  run(sandbox, 'revealLinkAfterDrawing = { nth: 7 };');
  sandbox.revealSelectedLink(canvasOf([first, second]));
  assert.deepEqual(seen, [second, first, first], 'a position the drawing does not have: the first, no error');
});

test('nothing is brought into view for a selection that is not a link, and the request does not outlive it', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  const seen = [];
  sandbox.revealDiagramNode = (node) => seen.push(node);
  state.selection = { kind: 'element', key: 'shop.web', mode: 'view' };
  run(sandbox, 'revealLinkAfterDrawing = { nth: null };');
  sandbox.revealSelectedLink(canvasOf([fakeLinkEl('customer', 'shop')]));
  assert.deepEqual(seen, []);
  run(sandbox, 'revealLinkAfterDrawing = { nth: null };');
  sandbox.settleLinkSelection();
  assert.equal(run(sandbox, 'revealLinkAfterDrawing'), false, 'render() clears a request that has no link to serve');
  state.selection = linkSelection('customer', 'shop');
  run(sandbox, "revealLinkAfterDrawing = { nth: null }; currentPerspective = 'elements';");
  sandbox.settleLinkSelection();
  assert.deepEqual(plain(state.selection), NONE, 'the link ended with the perspective');
  assert.equal(run(sandbox, 'revealLinkAfterDrawing'), false);
});

test('showDiagramScene brings the link into view after the outlines are set, and the click on a link still pins the framing', () => {
  const body = HTML.slice(HTML.indexOf('function showDiagramScene('), HTML.indexOf('function markMapSelection('));
  assert.ok(body.indexOf('revealSelectedLink(canvas);') > body.indexOf('markLinkSelection();'));
  assert.ok(
    body.indexOf('revealSelectedLink(canvas);') > body.indexOf('applyDiagramScale();'),
    'the scale is the one of the canvas as it is now'
  );
  const click = HTML.slice(HTML.indexOf("case 'select-link': {"), HTML.indexOf("case 'close-inspection':"));
  assert.ok(click.indexOf('takeOverDiagramFraming(canvas)') < click.indexOf('selectLink('), 'run 0019: the pin first');
  assert.ok(click.indexOf('revealLinkAfterDrawing = {') > click.indexOf('selectLink('));
});

test('the reveal pans a link that is behind the edge by the least it takes, and leaves a visible one where it is', async () => {
  const { sandbox } = await page('map', 'map', null);
  const moves = [];
  sandbox.moveDiagramBy = (canvas, dx, dy) => moves.push([dx, dy]);
  const canvas = {
    getBoundingClientRect: () => ({ left: 100, right: 700, top: 50 }),
    clientHeight: 400,
    parentElement: null
  };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  const node = (rect) => ({ querySelector: () => null, getBoundingClientRect: () => rect });
  sandbox.revealDiagramNode(node({ left: 300, right: 400, top: 100, bottom: 200 }));
  assert.deepEqual(moves, [], 'in view: not moved');
  sandbox.revealDiagramNode(node({ left: 650, right: 760, top: 100, bottom: 200 }));
  assert.deepEqual(moves, [[-84, 0]], 'behind the right edge (the panel): brought in to the margin, no more');
});

// ============================================================ 4. parallel links

test('only the links that have a twin say their position; a link on its own keeps its markup', async () => {
  const { sandbox } = await openFixture();
  const result = twinsResult(sandbox);
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '');
  const links = drawing.html.match(/<g class="dg-link"[^>]*>/g);
  assert.equal(links.length, 3);
  assert.match(links[0], /data-from="a" data-to="b" data-nth="0" data-action="select-link"/);
  assert.match(links[1], /data-from="a" data-to="b" data-nth="1" data-action="select-link"/);
  assert.ok(!links[2].includes('data-nth'), 'b to a is alone');
  const labels = (drawing.html.match(/<text class="dg-label"[^>]*>/g) || []).filter((t) => t.includes('data-from="a"'));
  assert.ok(
    labels.every((t) => /data-nth="[01]"/.test(t)),
    'the caption of a twin says it too, so a click on it is a click on that link'
  );
  const alone = await page('elements', 'overview', 'shop.web.api');
  assert.ok(!alone.drawing.html.includes('data-nth'), 'a drawing with no twins has no new attribute');
});

test('a click on a parallel link keeps the relationships of that link, not its position', async () => {
  const { sandbox, state } = await openFixture();
  const result = twinsResult(sandbox);
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '', {
    map: true,
    layer: 'application'
  });
  sandbox.__scene = { links: drawing.links };
  run(sandbox, "currentPerspective = 'map'; diagramScene = __scene;");
  sandbox.render = () => {};
  sandbox.document.getElementById = () => ({ getAttribute: () => null });
  click(sandbox, {
    'data-action': 'select-link',
    'data-from': 'a',
    'data-to': 'b',
    'data-nth': '1',
    'data-layer': 'application'
  });
  const keys = sandbox
    .relationshipsOfLink(
      drawing.links.find((p) => p.from === 'a').links[1],
      drawing.links.find((p) => p.from === 'a')
    )
    .map(sandbox.relationshipKeyOf);
  assert.deepEqual(plain(state.selection.via), keys);
  assert.ok(
    !('nth' in state.selection) && !JSON.stringify(state.selection).includes('"nth"'),
    'a position drifts with the next drawing: it is not kept'
  );
  // a pair of one link, or a click that does not say, adds nothing
  click(sandbox, {
    'data-action': 'select-link',
    'data-from': 'b',
    'data-to': 'a',
    'data-nth': '0',
    'data-layer': 'application'
  });
  assert.ok(!('via' in state.selection));
  click(sandbox, { 'data-action': 'select-link', 'data-from': 'a', 'data-to': 'b', 'data-layer': 'application' });
  assert.ok(!('via' in state.selection));
});

async function twinsPanel(selectionExtra, relationshipsOfFirst, relationshipsOfSecond) {
  const { sandbox, state } = await openFixture();
  const result = twinsResult(sandbox, relationshipsOfFirst, relationshipsOfSecond);
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '', {
    map: true,
    layer: 'application'
  });
  sandbox.__scene = { links: drawing.links };
  run(sandbox, "currentPerspective = 'map'; diagramScene = __scene;");
  const pair = drawing.links.find((p) => p.from === 'a');
  const via =
    selectionExtra === 'second'
      ? sandbox.relationshipsOfLink(pair.links[1], pair).map(sandbox.relationshipKeyOf)
      : undefined;
  state.selection = linkSelection('a', 'b', via ? { via } : {});
  return sandbox.renderLinkInspectionHtml(state.selection);
}

test('the panel says how many links join the boxes and marks the relationships of the one that was clicked, in words', async () => {
  const html = await twinsPanel('second');
  assert.match(
    html,
    /2 links join these two boxes, with 2 relationships in all\. The relationships of the link you clicked are marked\./
  );
  assert.ok(!html.includes('are grouped in this link'));
  const opens = html.match(/<div class="inspection-rel(?: inspection-rel-marked)?">/g);
  assert.deepEqual(
    opens,
    ['<div class="inspection-rel">', '<div class="inspection-rel inspection-rel-marked">'],
    'the second is the one clicked'
  );
  assert.equal((html.match(/Clicked link/g) || []).length, 1);
  assert.match(
    html,
    /<div class="inspection-rel-label">two<span class="inspection-rel-mark">Clicked link<\/span><\/div>/
  );
  assert.match(html, /<div class="inspection-rel-label">one<\/div>/);
});

test('without a way to tell them apart nothing is marked and the note does not pretend: from an address, or identical relationships', async () => {
  const fromAddress = await twinsPanel('none');
  assert.match(fromAddress, /2 links join these two boxes, with 2 relationships in all\.<\/p>/);
  assert.ok(!fromAddress.includes('Clicked link') && !fromAddress.includes('you clicked'));
  const same = { from: 'a', destination: 'b', label: 'same', qualifiers: [], tags: {} };
  const identical = await twinsPanel('second', [same], [same]);
  assert.match(identical, /2 links join these two boxes, with 1 relationship in all\.<\/p>/);
  assert.ok(!identical.includes('Clicked link'), 'both links carry the same relationship: either was clicked');
});

test('a link on its own, even grouping several relationships, is described as before', async () => {
  const { regions, state } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop', { via: ['whatever'] });
  const right = regions().right;
  assert.match(right, /2 relationships are grouped in this link\./);
  assert.ok(!right.includes('Clicked link') && !right.includes('links join'), 'a stale via cannot mark anything alone');
});

// ============================================================ 5. the badges in the header of an element

const STYLED = 'shop.payments'; // tagged `rendering-stereotypes: external`, which the fixture styles
const headerLabelOf = (center) => {
  const from = center.indexOf('<div class="element-header-label">') + '<div class="element-header-label">'.length;
  return center.slice(from, center.indexOf('</span></span></div>', from) + '</span></span>'.length);
};

async function elementsHeader(reference, tab, mode) {
  const { sandbox, state } = await openFixture();
  state.selection = { kind: 'element', key: reference, mode: mode || 'view' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = '" + tab + "'; diagramMaximized = false;");
  return { sandbox, state, center: sandbox.renderElementsPerspectiveHtml().center };
}

test('the header of an element shows its styled stereotypes after its kind and before its tabs: on Details and on each diagram tab', async () => {
  for (const tab of ['details', 'overview', 'detailed', 'deep']) {
    const { center } = await elementsHeader(STYLED, tab);
    const label = center.slice(
      center.indexOf('<div class="element-header-label">'),
      center.indexOf('<div class="element-header-actions">')
    );
    const kind = label.indexOf('class="element-kind-badge"');
    const badges = label.indexOf('class="element-header-badges"');
    const tabs = label.indexOf('class="viewpoint-switch"');
    assert.ok(kind !== -1 && badges > kind && tabs > badges, tab + ': kind, then the badges, then the tabs');
    assert.match(
      label,
      /<span class="element-header-badges" role="group" aria-label="Stereotypes"><span class="stereotype-badge"[^>]*>external<\/span><\/span>/,
      tab
    );
  }
});

test('it is the markup of the tree and the panel, once: the style cannot be told twice', async () => {
  const { sandbox, center } = await elementsHeader(STYLED, 'details');
  const record = sandbox.findElementRecord(STYLED);
  const expected = sandbox.stereotypeBadgesHtml(sandbox.stereotypesOfRecord(record));
  assert.ok(expected.includes('stereotype-badge'));
  assert.ok(
    center.includes('<span class="element-header-badges" role="group" aria-label="Stereotypes">' + expected + '</span>')
  );
  assert.equal(
    sandbox.renderHeaderBadgesHtml(record),
    '<span class="element-header-badges" role="group" aria-label="Stereotypes">' + expected + '</span>'
  );
});

test('an element with no styled stereotype has the header it had: no group, no empty badge', async () => {
  const { sandbox, center } = await elementsHeader('shop.web.api', 'overview');
  assert.ok(!center.includes('element-header-badges') && !center.includes('stereotype-badge'));
  assert.equal(sandbox.renderHeaderBadgesHtml(sandbox.findElementRecord('shop.web.api')), '');
});

test('the actions row and the other headers do not change: badges are on the label side only', async () => {
  const styled = await elementsHeader(STYLED, 'overview');
  const plainOne = await elementsHeader('shop.web.api', 'overview');
  const actionsOf = (center) =>
    center.slice(
      center.indexOf('<div class="element-header-actions">'),
      center.indexOf('</div>', center.indexOf('<div class="element-header-actions">'))
    );
  const normalise = (html, ref) => html.split(ref).join('REF');
  assert.ok(!actionsOf(styled.center).includes('stereotype'));
  assert.equal(
    normalise(actionsOf(styled.center), STYLED),
    normalise(actionsOf(plainOne.center), 'shop.web.api'),
    'the same actions, ids and data-actions'
  );
  const edit = await elementsHeader(STYLED, 'details', 'edit');
  assert.ok(!edit.center.includes('element-header-badges'), 'the edit form is not the title shared by the tabs');
  const map = await openFixture();
  map.state.selection = { kind: 'element', key: STYLED, mode: 'view' };
  run(map.sandbox, "currentPerspective = 'map'; diagramMaximized = false;");
  assert.ok(!map.sandbox.renderMapPerspectiveHtml().center.includes('element-header-badges'), "nor is the Map's");
});

const blockOf = (css, head) => {
  const at = css.indexOf(head);
  assert.notEqual(at, -1, head + ' is in the stylesheet');
  const open = css.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('no end');
};
const ruleBodies = (css, selector) =>
  Array.from(css.matchAll(/([^{}@]+)\{([^{}]*)\}/g))
    .filter((m) => m[1].trim() === selector)
    .map((m) => m[2].trim());
const ruleBody = (css, selector) => {
  const found = ruleBodies(css, selector);
  assert.equal(found.length, 1, 'exactly one rule for ' + selector + ', found ' + found.length);
  return found[0];
};

test('the group gives way first and shows whole badges only, so the name keeps the room the states were sized for', () => {
  const bodies = ruleBodies(CSS_NO_COMMENTS, '.element-header-badges');
  assert.equal(bodies.length, 2, 'the base rule and the override of the tight state');
  const base = bodies[0];
  assert.match(base, /flex: 0 100 auto;/, 'it shrinks 100 times faster than the name (flex-shrink 1)');
  assert.match(base, /min-width: 0;/);
  assert.match(base, /display: flex;/, 'flex-wrap does nothing without it');
  assert.match(
    base,
    /margin-left: -0\.5rem;/,
    'the gap of the label row is paid for by the group even at zero width: this gives most of it back'
  );
  assert.match(base, /max-height: 1\.1rem;/, 'one badge row high');
  assert.match(base, /overflow: hidden;/);
  assert.match(base, /flex-wrap: wrap;/, 'so that the badges that do not fit as a whole are the ones clipped');
  assert.ok(
    !/(^|;)\s*flex-shrink:\s*0/.test(ruleBody(CSS_NO_COMMENTS, '.element-header-label h2')),
    'the name still shrinks'
  );
  const first = CSS_NO_COMMENTS.indexOf('@container center (max-width: 85rem)');
  assert.ok(
    CSS_NO_COMMENTS.indexOf('.element-header-badges {') < first,
    'the base rule is before the first query, which add no specificity'
  );
});

test('in the tight state, where the label wraps, every badge shows; no container query and no colour was added', () => {
  const tight = blockOf(CSS_NO_COMMENTS, '@container center (max-width: 46rem)');
  assert.equal(
    ruleBody(tight, '.element-header-badges'),
    'max-height: none; max-width: 100%; flex: none; margin-left: 0;',
    'a row of its own: all of them, no pull to the left, never wider than the row'
  );
  assert.deepEqual(
    CSS_NO_COMMENTS.match(/@container[^{]*/g).map((q) => q.trim()),
    ['85', '60', '46'].map((rem) => '@container center (max-width: ' + rem + 'rem)'),
    'still exactly the three states'
  );
  const added =
    ruleBodies(CSS_NO_COMMENTS, '.element-header-badges')[0] +
    ruleBody(tight, '.element-header-badges') +
    ruleBody(CSS_NO_COMMENTS, '.inspection-rel-marked') +
    ruleBody(CSS_NO_COMMENTS, '.inspection-rel-mark');
  assert.doesNotMatch(added, /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/, "the theme's tokens only");
  assert.match(ruleBody(CSS_NO_COMMENTS, '.inspection-rel-marked'), /var\(--accent\)/);
});
