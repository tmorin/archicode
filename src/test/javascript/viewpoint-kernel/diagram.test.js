'use strict';
// What the standalone editor does with the kernel's answer: the URL of a diagram, the header controls, the boxes and
// links handed to the layout engine, the SVG, the boxes for relationships that point at nothing.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { openFixture } = require('./harness');

/** A layout shaped like ELK's answer, without ELK: every box 100x40 under its parent, edges as one straight segment. */
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

const run = (sandbox, code) => vm.runInContext(code, sandbox);

test('the URL carries the tab and the facet of a diagram, and restores them; an old Diagram link still opens', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'deep'; diagramFacet = 'no-smtp';");
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  assert.equal(sandbox.currentRouteHash(), '/elements?ref=shop.web.api&tab=deep&facet=no-smtp');

  run(sandbox, "elementTab = 'details';");
  assert.equal(sandbox.currentRouteHash(), '/elements?ref=shop.web.api', 'Details stays out of the URL, and so does the facet it ignores');

  sandbox.location.hash = '#/elements?ref=shop.web.api&tab=detailed&facet=rest-only';
  sandbox.syncPerspectiveFromHash();
  assert.equal(run(sandbox, 'elementTab'), 'detailed');
  assert.equal(run(sandbox, 'diagramFacet'), 'rest-only');

  sandbox.location.hash = '#/elements?ref=shop.web.api&tab=sideways&facet=nope';
  sandbox.syncPerspectiveFromHash();
  assert.equal(run(sandbox, 'elementTab'), 'details', 'an unknown tab falls back');
  assert.equal(run(sandbox, 'diagramFacet'), null, 'an unknown facet falls back');

  // the links of the Diagram perspective, which is gone, open the matching tab
  sandbox.location.hash = '#/diagram?ref=shop.web.api&vp=deep&facet=no-smtp';
  sandbox.syncPerspectiveFromHash();
  assert.equal(run(sandbox, 'currentPerspective'), 'elements');
  assert.equal(run(sandbox, 'elementTab'), 'deep');
  assert.equal(run(sandbox, 'diagramFacet'), 'no-smtp');
  sandbox.location.hash = '#/diagram?ref=shop.web.api';
  sandbox.syncPerspectiveFromHash();
  assert.equal(run(sandbox, 'elementTab'), 'overview', 'a Diagram link with no viewpoint was the overview');
});

test('the header of Elements offers Details and the three viewpoints, and the facets of the workspace', async () => {
  const { sandbox, state } = await openFixture();
  const leaf = state.index.application.get('shop.catalog.service.search');
  const parent = state.index.application.get('shop.catalog');
  const tabs = sandbox.renderElementTabsHtml(parent);
  assert.deepEqual(Array.from(tabs.matchAll(/data-tab="(\w+)"/g), (m) => m[1]), ['details', 'overview', 'detailed', 'deep']);
  assert.match(tabs, /data-tab="details" aria-pressed="true"/, 'an element opens on its Details');
  assert.match(sandbox.renderElementTabsHtml(leaf), /data-tab="detailed"[^>]*disabled/);
  assert.doesNotMatch(tabs, /data-tab="detailed"[^>]*disabled/);
  run(sandbox, "elementTab = 'detailed';");
  assert.equal(sandbox.effectiveDiagramViewpoint(leaf), 'overview');
  assert.match(sandbox.renderElementTabsHtml(leaf), /data-tab="overview" aria-pressed="true"/);

  const select = sandbox.renderFacetSelectHtml();
  for (const name of ['rest-only', 'no-smtp', 'quiet-infra', 'keep-untyped']) assert.ok(select.includes('value="' + name + '"'), name);
  assert.ok(select.includes('<option value="">Facet: none</option>'));
});

test('boxes and links reach the layout engine one for one', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('deep', 'shop').input);
  const graph = sandbox.buildElkGraph(result);
  const count = (n) => (n.children || []).reduce((c, k) => c + 1 + count(k), 0);
  assert.equal(count(graph), result.items.length);
  assert.equal(graph.edges.length, result.links.filter((l) => !l.secondary).length);
});

test('the SVG: clickable boxes, the focal one marked, grouped links explain themselves, no fold button outside the map', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input);
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, 'shop.web.api');
  const svg = drawing.html;
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('data-action="goto-element"') && svg.includes('dg-focal'));
  assert.ok(!svg.includes('toggle-fold'), 'an overview is drawn as the CLI draws it: no fold button');
  assert.equal((svg.match(/<g class="dg-link"/g) || []).length, result.links.length);
  assert.ok(svg.includes('relationships are grouped here') || svg.includes('relationship is grouped here'), 'a grouped link lists what it stands for');
  assert.ok(drawing.focal && drawing.focal.x > 0, 'the focal box is located, to center on it');
  assert.doesNotMatch(svg, /<script|onclick=/i);
});

test('a folded box is drawn as a box that says how much it hides', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('deep', 'shop.catalog', { collapsed: ['shop.catalog.service'] }).input);
  const svg = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, 'shop.catalog').html;
  assert.match(svg, /2 hidden/);
});

test('folded ids given as a Set (what the UI keeps) reach the kernel', async () => {
  const { sandbox } = await openFixture();
  const input = run(sandbox, "buildKernelInput('deep', 'shop.catalog', { collapsed: new Set(['shop.catalog.service']) }).input");
  assert.deepEqual(Array.from(input.collapsed), ['shop.catalog.service']);
  assert.equal(run(sandbox, "buildKernelInput('deep', 'shop.catalog', { collapsed: new Set() }).input.collapsed"), undefined);
});

test('names and references are escaped in the SVG', async () => {
  const { sandbox } = await openFixture();
  const evil = 'x"><script>alert(1)</script>';
  const result = { items: [{ id: evil, reference: evil, parent: null, collapsed: false, hidden: 0 }], links: [] };
  const svg = sandbox.renderDiagramSvg({ id: 'root', children: [{ id: evil, x: 0, y: 0, width: 10, height: 10 }], edges: [], width: 20, height: 20 }, result, 'a').html;
  assert.ok(!svg.includes('<script>'));
});

test('a relationship that points at nothing becomes a box that opens its owner', async () => {
  const { sandbox, state, kernel } = await openFixture();
  sandbox.commitElementEdit('shop.web.api', (node) => {
    node.relationships = node.relationships.concat([{ destination: 'shop.nowhere', label: 'lost' }]);
  });
  const { input } = sandbox.buildKernelInput('overview', 'shop.web.api');
  assert.ok(!kernel.compute(input).error, 'the kernel never sees it');
  const result = kernel.compute(input);
  const ghosts = sandbox.buildDiagramGhosts(result, 'shop.web.api', 'application');
  assert.equal(ghosts.total, 1);
  assert.equal(ghosts.items[0].owner, 'shop.web.api');
  assert.equal(ghosts.links[0].label, 'lost');

  const drawn = { items: result.items.concat(ghosts.items), links: result.links.concat(ghosts.links) };
  const svg = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(drawn)), drawn, 'shop.web.api').html;
  assert.ok(svg.includes('data-action="fix-dangling" data-ref="shop.web.api"'));
  assert.ok(svg.includes('dg-ghost-edge'));
  assert.match(sandbox.diagramStatusText('overview', 'shop.web.api', null, result, ghosts), /1 relationship points at an unknown element/);

  for (let i = 0; i < 20; i++) {
    sandbox.commitElementEdit('shop.web.api', (node) => { node.relationships = node.relationships.concat([{ destination: 'shop.void' + i }]); });
  }
  const many = sandbox.buildDiagramGhosts(kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input), 'shop.web.api', 'application');
  assert.equal(many.items.length, 12, 'a handful is drawn, the rest is counted');
  assert.equal(many.total, 21);
  assert.ok(state.index.application.get('shop.web.api'));
});

test('a facet changes the diagram, and an edit that is not saved yet shows in the next one', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const facet = state.workspace.settings.facets.customs.find((f) => f.name === 'no-smtp');
  const plain = kernel.compute(sandbox.buildKernelInput('deep', 'shop.web.api').input);
  const filtered = kernel.compute(sandbox.buildKernelInput('deep', 'shop.web.api', { facet }).input);
  assert.ok(plain.links.some((l) => l.to === 'mailer') && !filtered.links.some((l) => l.to === 'mailer'));

  sandbox.commitElementEdit('shop.web.session', (node) => { node.relationships = [{ destination: 'shop.payments', label: 'brand new link' }]; });
  const after = kernel.compute(sandbox.buildKernelInput('deep', 'shop.web.session').input);
  assert.ok(after.links.some((l) => l.label === 'brand new link'));
});

test('without a layout engine the diagram is still a clickable list', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('deep', 'shop.web').input);
  const html = sandbox.renderDiagramFallbackHtml(result);
  assert.ok(html.includes('data-action="goto-element"') && html.includes('<li>'));
});

test('the tag values of YAML are given to the kernel as text, as Jackson reads them', async () => {
  const { sandbox } = await openFixture();
  const { input } = sandbox.buildKernelInput('overview', 'shop.web.api');
  sandbox.commitElementEdit('shop.web.api', (node) => {
    node.relationships = node.relationships.concat([{ destination: 'shop.payments', label: 'tagged', tags: { secure: true, port: 443 } }]);
  });
  const edited = sandbox.buildKernelInput('overview', 'shop.web.api').input;
  const tagged = edited.elements.find((e) => e.reference === 'shop.web.api').relationships.find((r) => r.label === 'tagged');
  assert.deepEqual(Object.assign({}, tagged.tags), { secure: 'true', port: '443' });
  assert.ok(input);
});

test('on the map, a box that hides children can be opened and an open one closed; the focal-less map has no box to protect', async () => {
  const { sandbox, kernel } = await openFixture();
  run(sandbox, "currentPerspective = 'map';");
  const draw = (opened) => {
    const result = kernel.compute(sandbox.buildKernelInput('map', null, { opened }).input);
    return { result, svg: sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '').html };
  };
  const closed = draw([]);
  assert.match(closed.svg, /data-mode="expand" data-id="shop"/);
  const opened = draw(['shop']);
  assert.match(opened.svg, /data-mode="close" data-id="shop"/);
  assert.match(opened.svg, /data-mode="expand" data-id="shop.catalog"/);
});

test('the viewpoints of an element have no fold button, no Fold all / Unfold all and no Hide unlinked: those belong to the map', async () => {
  const { sandbox, kernel } = await openFixture();
  const record = sandbox.findElementRecord('shop.web.api');
  const elementTools = sandbox.renderDiagramCanvasHtml(record);
  for (const gone of ['fold-all', 'unfold-all', 'toggle-hide-unlinked']) assert.ok(!elementTools.includes(gone), gone);
  for (const kept of ['data-dir="out"', 'data-dir="in"', 'diagram-center-button', 'diagram-fit-button', 'diagram-export']) assert.ok(elementTools.includes(kept), kept);
  const mapTools = sandbox.renderDiagramCanvasHtml(null);
  for (const there of ['fold-all', 'unfold-all', 'toggle-hide-unlinked']) assert.ok(mapTools.includes(there), there);

  // a click that would fold on a diagram of an element does nothing: there is nothing to fold
  run(sandbox, "currentPerspective = 'elements';");
  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  click('toggle-hide-unlinked');
  assert.equal(run(sandbox, 'diagramHideUnlinked'), false);
  const out = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api', {}).input);
  assert.ok(out.items.some((i) => i.expandable), 'the kernel still says what could be opened; the editor does not offer it');
});

test('Elements shows the page of the element on Details and its diagram on the other tabs, with no panel but the tree', async () => {
  const { sandbox, state } = await openFixture();
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details'; diagramMaximized = false;");
  const details = sandbox.renderElementsPerspectiveHtml();
  assert.ok(details.left && details.right === null && details.bottom === null);
  assert.ok(!details.center.includes('diagram-canvas'), 'no diagram on the page of the element');
  assert.ok(details.center.includes('data-action="toggle-element-edit"') && details.center.includes('data-action="set-element-tab"'));
  assert.ok(!details.center.includes('Open in Diagram'));
  assert.ok(details.center.includes('Relationships') && details.center.includes('field-label'), 'the properties and relationships stay on the page');
  assert.ok(details.center.includes('data-action="show-on-map" data-ref="shop.web.api"'));

  run(sandbox, "elementTab = 'deep';");
  const deep = sandbox.renderElementsPerspectiveHtml();
  assert.ok(deep.center.includes('id="diagram-canvas"') && deep.center.includes('diagram-facet-select'));
  assert.match(deep.center, /data-tab="deep" aria-pressed="true"/);
  assert.ok(deep.right === null && deep.bottom === null);

  // editing is done on the Details, whatever tab was open
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'edit' };
  const edit = sandbox.renderElementsPerspectiveHtml();
  assert.ok(!edit.center.includes('id="diagram-canvas"'));
  assert.equal(run(sandbox, 'elementTab'), 'details');

  // nothing, or something that is not an element, is selected: the placeholder, whatever the tab
  run(sandbox, "elementTab = 'overview';");
  state.selection = { kind: 'none', key: null, mode: 'view' };
  assert.ok(!sandbox.renderElementsPerspectiveHtml().center.includes('id="diagram-canvas"'));
  assert.equal(run(sandbox, 'diagramTabShown()'), false);
});



test('maximizing the diagram hides the tree, and only on a diagram', async () => {
  const { sandbox, state } = await openFixture();
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'overview'; diagramMaximized = false;");
  const normal = sandbox.renderElementsPerspectiveHtml();
  assert.ok(normal.left);
  assert.match(normal.center, /data-action="toggle-maximize"[^>]*>Maximize</);

  run(sandbox, 'diagramMaximized = true;');
  const maximized = sandbox.renderElementsPerspectiveHtml();
  assert.equal(maximized.left, null);
  assert.match(maximized.center, /data-action="toggle-maximize"[^>]*>Restore</);

  run(sandbox, "elementTab = 'details';");
  assert.ok(sandbox.renderElementsPerspectiveHtml().left, 'the page of an element always has its tree');
});

test('framing: a diagram that fits is centered whole, one that does not keeps the element in view without empty margins', async () => {
  const { sandbox } = await openFixture();
  const view = { width: 1000, height: 600 };
  const frame = (drawing, focal, scale) => JSON.parse(JSON.stringify(sandbox.diagramFrameCenter(view, drawing, focal, scale)));
  const box = (x, y, w, h) => ({ x, y, w, h });

  // fits: the element at the far left no longer leaves half of the view blank
  assert.deepEqual(frame({ width: 800, height: 300 }, box(100, 150, 120, 60), 1), { x: 400, y: 150 });
  // too wide: centered on the element, but never past the edges of the drawing (24px of margin)
  const wide = { width: 3000, height: 300 };
  assert.equal(frame(wide, box(100, 150, 120, 60), 1).x, 500 - 24, 'an element at the left end: the view starts at the drawing');
  assert.equal(frame(wide, box(2950, 150, 120, 60), 1).x, 3000 - 500 + 24, 'and at the right end');
  assert.equal(frame(wide, box(1500, 150, 120, 60), 1).x, 1500, 'in the middle: centered on it');
  assert.equal(frame(wide, box(100, 150, 120, 60), 1).y, 150, 'the axis that fits is centered');
  // an element bigger than the view: anchored by its start, so that its title shows
  const big = frame({ width: 4000, height: 3000 }, box(2000, 1500, 2400, 2000), 1);
  assert.equal(big.x, 800 - 24 + 500, 'left edge of the element (800), a margin, half the view');
  assert.equal(big.y, 500 - 24 + 300, 'top edge of the element (500), a margin, half the view');
  // the scale
  assert.equal(sandbox.diagramAutoScale(view, { width: 800, height: 300 }), 1, 'never enlarged');
  assert.equal(sandbox.diagramAutoScale(view, { width: 1500, height: 300 }), 0.8 > (1000 - 48) / 1500 ? 0.8 : (1000 - 48) / 1500);
  assert.equal(sandbox.diagramAutoScale(view, { width: 9000, height: 5000 }), 0.8, 'a readable size, not the whole thing');
  assert.ok(sandbox.diagramFitScale(view, { width: 9000, height: 5000 }) < 0.2, 'Fit still shows everything');
});

test('overviews are laid out top to bottom', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input);
  assert.equal(sandbox.buildElkGraph(result).layoutOptions['elk.direction'], 'DOWN');
});

test('through a facet, an element left with nothing says so and offers the diagram without the facet', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const facet = state.workspace.settings.facets.customs.find((f) => f.name === 'rest-only');
  const quiet = sandbox.quietReferencesThroughFacet(kernel, facet);
  const reference = Array.from(quiet).find((ref) => state.index.application.has(ref) &&
    kernel.compute(sandbox.buildKernelInput('overview', ref).input).links.some((l) => !l.secondary));
  assert.ok(reference, 'the facet empties at least one element that has links of its own');

  const html = sandbox.diagramEmptyHtml(kernel, 'overview', reference, facet, '');
  assert.match(html, /facet “rest-only” removes the/);
  assert.ok(html.includes('data-action="clear-facet"'));
  assert.ok(!sandbox.diagramEmptyHtml(kernel, 'overview', reference, null, '').includes('clear-facet'), 'no facet, no such offer');
});

test('the tree can tell which elements a facet leaves with nothing to draw', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const facet = (name) => state.workspace.settings.facets.customs.find((f) => f.name === name);
  const refs = Array.from(state.index.application.keys());
  const quiet = sandbox.quietReferencesThroughFacet(kernel, facet('rest-only'));
  assert.ok(quiet.size > 0 && quiet.size < refs.length + state.index.technology.size);
  for (const ref of refs) {
    const out = kernel.compute(sandbox.buildKernelInput('overview', ref, { facet: facet('rest-only') }).input);
    assert.equal(quiet.has(ref), !out.links.some((l) => !l.secondary), ref);
  }
  assert.ok(sandbox.quietReferencesThroughFacet(kernel, facet('no-smtp')) !== quiet, 'another facet, another answer');
});

test('"Hide unlinked" leaves out the boxes no link reaches, keeps the focal one and what encloses the others', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const facet = state.workspace.settings.facets.customs.find((f) => f.name === 'rest-only');
  // detailed through a facet that empties some children: they are drawn, linked to nothing
  const parent = Array.from(state.index.application.keys()).find((ref) => {
    const rec = state.index.application.get(ref);
    if (["person", "component"].includes(rec.kind) || !(rec.children || []).length) return false;
    const out = kernel.compute(sandbox.buildKernelInput('detailed', ref, { facet }).input);
    const linked = new Set(out.links.flatMap((l) => [l.from, l.to]));
    return out.links.length && out.items.some((i) => !linked.has(i.id) && i.id !== ref && !ref.startsWith(i.id + '.'));
  });
  assert.ok(parent, 'a parent whose children the facet leaves partly unlinked');
  const out = kernel.compute(sandbox.buildKernelInput('detailed', parent, { facet }).input);
  const kept = sandbox.hideUnlinkedItems(out.items, out.links, parent);
  assert.ok(kept.hidden > 0 && kept.items.length === out.items.length - kept.hidden);
  assert.equal(kept.links.length, out.links.length, 'no link is lost');
  const ids = new Set(kept.items.map((i) => i.id));
  assert.ok(ids.has(parent), 'the focal box stays');
  for (const item of kept.items) assert.ok(!item.parent || ids.has(item.parent), 'what encloses a kept box stays: ' + item.id);
  for (const link of out.links) assert.ok(ids.has(link.from) && ids.has(link.to));

  const alone = sandbox.hideUnlinkedItems([{ id: 'a', parent: null }], [], 'a');
  assert.deepEqual(JSON.parse(JSON.stringify(alone.items)), [{ id: 'a', parent: null }], 'the focal box of an empty view stays');
});

test('the toolbar of the map offers "Hide unlinked", pressed when it is on', async () => {
  const { sandbox, state } = await openFixture();
  assert.match(sandbox.renderDiagramCanvasHtml(null), /data-action="toggle-hide-unlinked" aria-pressed="false"/);
  assert.equal(run(sandbox, 'diagramHideUnlinked'), false);
});

test('Center and Fit are lit while the diagram is framed that way, and only then', async () => {
  const { sandbox } = await openFixture();
  const record = sandbox.findElementRecord('shop.web.api');
  const html = () => sandbox.renderDiagramCanvasHtml(record, false);
  assert.match(html(), /id="diagram-center-button"[^>]*aria-pressed="true"/, 'a diagram opens framed on its element');
  assert.match(html(), /id="diagram-fit-button"[^>]*aria-pressed="false"/);
  sandbox.eval ? sandbox.eval("diagramScale = 'fit'") : require('node:vm').runInContext("diagramScale = 'fit'", sandbox);
  assert.match(html(), /id="diagram-center-button"[^>]*aria-pressed="false"/);
  assert.match(html(), /id="diagram-fit-button"[^>]*aria-pressed="true"/);
});

test('the map opens folded: nothing is open, not even the solutions', async () => {
  const { sandbox, state, kernel } = await openFixture();
  assert.equal(run(sandbox, 'defaultMapOpened().size'), 0);
  const { input } = sandbox.buildKernelInput('map', null, { opened: [] });
  assert.equal(input.viewpoint, 'map');
  assert.equal(input.focal, '');
  assert.equal(input.layer, 'application');
  const out = kernel.compute(input);
  const ids = Array.from(out.items, (i) => i.id).sort();
  assert.deepEqual(ids, ['customer', 'mailer', 'shop'], 'the solution is one box');
  assert.ok(out.items.find((i) => i.id === 'shop').expandable, 'a closed solution can be opened');
  assert.ok(out.links.length > 0 && out.links.every((l) => ids.includes(l.from) && ids.includes(l.to)));
  assert.ok(state.index.application.size > ids.length);
});

test('the Map perspective draws the workspace without any element selected, with the pinned and hidden ones as chips', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'map'; mapPinned = ['shop.web']; mapHidden = ['mailer'];");
  state.selection = { kind: 'none', key: null, mode: 'view' };
  const html = sandbox.renderMapPerspectiveHtml();
  assert.ok(html.center.includes('data-map="true"') && html.center.includes('<h2>Map</h2>'));
  assert.ok(html.center.includes('Pinned: Web') && html.center.includes('Hidden: Mail'), 'the pinned and the hidden elements are chips');
  assert.ok(html.center.includes('data-action="map-unpin"') && html.center.includes('data-action="map-unhide"'));
  assert.ok(!html.center.includes('viewpoint-switch'), 'the viewpoints are the Diagram perspective\'s');
  assert.ok(!html.center.includes('open-as-diagram'), 'nothing selected, nothing to open');

  state.selection = { kind: 'element', key: 'shop.catalog', mode: 'view' };
  const picked = sandbox.renderMapPerspectiveHtml();
  assert.ok(picked.center.includes('data-action="open-as-diagram" data-ref="shop.catalog"'));
  assert.ok(picked.right === null && picked.bottom === null && html.right === null && html.bottom === null, 'the map has the room to itself: no panel on the right or at the bottom');
});

test('the tree of the Map says what each element is for the map, and picking one finds it there', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'map'; mapOpened = null; mapPinned = ['shop.catalog']; mapHidden = ['mailer'];");
  state.selection = { kind: 'none', key: null, mode: 'view' };
  assert.ok(sandbox.renderMapScopeHtml().includes('data-ref="shop.catalog"') === false, 'closed branches are not drawn');
  state.expanded.add('shop');
  const html = sandbox.renderMapScopeHtml();
  assert.match(html, /map-scope-row pinned[^>]*data-action="map-select" data-ref="shop.catalog"/);
  assert.match(html, /map-scope-row left-out[^>]*data-ref="mailer"/);
  assert.match(html, /data-action="map-hide" data-ref="shop"[^>]*disabled/, 'what encloses a pinned element cannot be hidden');
  assert.match(html, /data-action="map-pin" data-ref="mailer" aria-pressed="false" aria-label="Pin Mail Provider"/);
  assert.ok(html.includes('class="tree-node-label" title="Mail Provider"') && html.includes('class="tree-node-kind" title="system">SYS<'), 'a long name can be read in full, the kind is short');
  assert.ok(!/>\s*(Pin|Hide)\s*</.test(html), 'the buttons are icons, they leave the room to the name');
  assert.ok(html.includes('class="map-scope-mark"') && html.includes('title="Pinned"'), 'a pinned element is marked without hovering');

  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  run(sandbox, 'mapPinned = []; mapHidden = [];');
  click('map-select', { 'data-ref': 'shop.web.edge.gateway' });
  assert.equal(state.selection.key, 'shop.web.edge.gateway');
  assert.equal(run(sandbox, 'JSON.stringify(Array.from(currentMapOpened()).sort())'), JSON.stringify(['shop', 'shop.web', 'shop.web.edge']), 'the boxes around it are opened');
  assert.equal(run(sandbox, 'mapRevealRef'), 'shop.web.edge.gateway');
  click('map-hide', { 'data-ref': 'mailer' });
  click('map-hide', { 'data-ref': 'mailer' });
  assert.equal(run(sandbox, 'mapHidden.length'), 0, 'Hide on a hidden element brings it back');
});

test('Elements and Map lead to each other, and the URL of the map carries the facet and the pinned elements', async () => {
  const { sandbox, state } = await openFixture();
  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'deep'; mapPinned = ['shop.payments']; diagramFacet = 'no-smtp';");
  state.selection = { kind: 'element', key: 'shop.web', mode: 'view' };
  assert.ok(sandbox.renderElementsPerspectiveHtml().center.includes('data-action="show-on-map" data-ref="shop.web"'));
  click('show-on-map', { 'data-ref': 'shop.web' });
  assert.equal(run(sandbox, 'currentPerspective'), 'map');
  assert.equal(run(sandbox, 'JSON.stringify(mapPinned)'), JSON.stringify(['shop.web']), 'the element replaces what was pinned');
  assert.equal(sandbox.currentRouteHash(), '/map?ref=shop.web&facet=no-smtp&pin=shop.web');

  click('open-as-diagram', { 'data-ref': 'shop.web' });
  assert.equal(run(sandbox, 'currentPerspective'), 'elements');
  assert.equal(run(sandbox, 'elementTab'), 'deep', 'a diagram that was open stays the one shown');
  run(sandbox, "elementTab = 'details';");
  click('show-on-map', { 'data-ref': 'shop.web' });
  click('open-as-diagram', { 'data-ref': 'shop.web' });
  assert.equal(run(sandbox, 'elementTab'), 'overview', 'from Details, the diagram is the overview');
  assert.equal(sandbox.currentRouteHash(), '/elements?ref=shop.web&tab=overview&facet=no-smtp');

  run(sandbox, 'mapPinned = []; diagramFacet = null;');
  sandbox.location.hash = '#/map?pin=shop.web,nope&facet=rest-only';
  sandbox.syncPerspectiveFromHash();
  assert.equal(run(sandbox, 'currentPerspective'), 'map');
  assert.equal(run(sandbox, 'JSON.stringify(mapPinned)'), JSON.stringify(['shop.web']), 'an element that does not exist is dropped');
  assert.equal(run(sandbox, 'diagramFacet'), 'rest-only');
});

test('a box that contains others is not given a minimum height that leaves it mostly empty', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('deep', 'shop').input);
  const graph = sandbox.buildElkGraph(result);
  const composite = (n) => (n.children || []).flatMap((k) => (k.children && k.children.length ? [k] : []).concat(composite(k)));
  const boxes = composite(graph);
  assert.ok(boxes.length > 0);
  for (const box of boxes) {
    // ELK reads this minimum as (height, width) for a diagram laid out top to bottom
    assert.match(box.layoutOptions['elk.nodeSize.minimum'], /^\(0, \d+\)$/, box.id);
  }
});

test('pin, hide, open and close act on the map, and unfold-all goes one level down', async () => {
  const { sandbox, kernel } = await openFixture();
  run(sandbox, "currentPerspective = 'map'; mapOpened = null; mapPinned = []; mapHidden = [];");
  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  const state = () => JSON.parse(vm.runInContext('JSON.stringify({ opened: Array.from(currentMapOpened()).sort(), pinned: mapPinned, hidden: mapHidden })', sandbox));
  const scene = () => {
    const s = JSON.parse(run(sandbox, 'JSON.stringify(currentMapState())'));
    const out = kernel.compute(sandbox.buildKernelInput('map', null, s).input);
    vm.runInContext('diagramScene = ' + JSON.stringify(sandbox.diagramFoldTargets(out, '')), sandbox);
    return out;
  };

  click('toggle-fold', { 'data-id': 'shop.web', 'data-mode': 'expand' });
  assert.deepEqual(state().opened, ['shop.web']);
  click('toggle-fold', { 'data-id': 'shop', 'data-mode': 'expand' });
  click('toggle-fold', { 'data-id': 'shop', 'data-mode': 'close' });
  assert.deepEqual(state().opened, [], 'closing a box closes what was opened inside it');

  click('map-pin', { 'data-ref': 'shop.catalog' });
  assert.deepEqual(state().pinned, ['shop.catalog']);
  click('map-hide', { 'data-ref': 'mailer' });
  assert.deepEqual(state().hidden, ['mailer']);
  click('map-pin', { 'data-ref': 'shop.catalog' });
  click('map-unhide', { 'data-ref': 'mailer' });
  assert.deepEqual([state().pinned, state().hidden], [[], []]);

  const closed = scene().items.length;
  click('unfold-all');
  const oneLevel = scene().items.length;
  assert.ok(oneLevel > closed, 'every closed box that has children is opened');
  click('fold-all');
  assert.deepEqual(state().opened, [], 'fold-all folds everything');
  assert.equal(scene().items.length, closed);
});

test('the map opens whole: with no element to put in the middle, auto framing is the fit', async () => {
  const { sandbox } = await openFixture();
  const canvas = { parentElement: null, clientWidth: 1000, clientHeight: 600 };
  run(sandbox, "diagramScale = 'auto'");
  vm.runInContext("diagramScene = { hasSvg: true, width: 3000, height: 1800, focal: null }", sandbox);
  const scale = sandbox.resolveDiagramScale(canvas);
  assert.ok(scale < 0.8, 'the readable floor does not apply: ' + scale);
  vm.runInContext("diagramScene = { hasSvg: true, width: 3000, height: 1800, focal: { x: 1500, y: 900, w: 100, h: 50 } }", sandbox);
  assert.equal(sandbox.resolveDiagramScale(canvas), 0.8, 'an element in the middle keeps the floor');
});

test('the status line of the map speaks of the workspace', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('map', null, { opened: [] }).input);
  const ghosts = sandbox.buildDiagramGhosts(result, null, 'application');
  assert.match(sandbox.diagramStatusText('map', '', null, result, ghosts), /^Map of the workspace — 3 items, \d+ links?/);
});

test('the map leaves the captions out of the layout unless asked, and knows where each box is for Center', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('map', null, { opened: ['shop'] }).input);
  const withCaptions = sandbox.buildElkGraph(result);
  const without = sandbox.buildElkGraph(result, { captions: false });
  assert.ok(withCaptions.edges.some((e) => e.labels && e.labels.length), 'by default the captions are laid out');
  assert.ok(without.edges.length > 0 && without.edges.every((e) => !e.labels), 'without captions the edges carry none');

  const drawing = sandbox.renderDiagramSvg(fakeLayout(without), result, '');
  assert.ok(drawing.boxes['shop.web'] && drawing.boxes['shop.web'].w > 0, 'the box of every element is known');
  assert.equal(drawing.focal, null, 'the map has no focal element of its own: the selection is the one');
});
