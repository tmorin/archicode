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
  for (const name of ['rest-only', 'no-smtp', 'quiet-infra', 'keep-untyped', 'unaudited', 'audited-only']) assert.ok(select.includes('value="' + name + '"'), name);
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
    return { result, svg: sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '', { map: true, opened, pinned: [] }).html };
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
  assert.match(normal.center, /data-action="toggle-maximize"[^>]*>.*<span class="maximize-label">Maximize<\/span>/);

  run(sandbox, 'diagramMaximized = true;');
  const maximized = sandbox.renderElementsPerspectiveHtml();
  assert.equal(maximized.left, null);
  assert.match(maximized.center, /data-action="toggle-maximize"[^>]*>.*<span class="maximize-label">Restore<\/span>/);

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
  assert.match(html(), /id="diagram-center-button"[^>]*data-lit="true"/, 'a diagram opens framed on its element');
  assert.match(html(), /id="diagram-fit-button"[^>]*aria-pressed="false"/);
  sandbox.eval ? sandbox.eval("diagramScale = 'fit'") : require('node:vm').runInContext("diagramScale = 'fit'", sandbox);
  assert.match(html(), /id="diagram-center-button"[^>]*data-lit="false"/);
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

test('the tree of the Map only folds and unfolds, and says what each element is for the map', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'map'; mapOpened = null; mapPinned = ['shop.catalog']; mapHidden = ['mailer'];");
  state.selection = { kind: 'element', key: 'shop.catalog', mode: 'view' };
  assert.ok(sandbox.renderMapScopeHtml().includes('data-ref="shop.catalog"') === false, 'closed branches are not drawn');
  state.expanded.add('shop');
  const html = sandbox.renderMapScopeHtml();
  assert.ok(!html.includes('map-select'), 'a row selects nothing');
  assert.ok(!/tree-node-row[^"]*\bactive\b/.test(html), 'and the tree does not show a selection');
  assert.match(html, /map-scope-row pinned foldable"[^>]*data-action="toggle-element" data-ref="shop.catalog"/, 'a row with children folds or unfolds it');
  assert.match(html, /<div class="tree-node-row map-scope-row left-out"[^>]*data-node="mailer"[^>]*><span class="tree-toggle tree-toggle-empty"/, 'a row with none does nothing');
  assert.doesNotMatch(html, /data-action="map-hide" data-ref="shop"/, 'what encloses a pinned element has no Hide button, rather than a disabled one');
  assert.doesNotMatch(html, /data-action="map-hide" data-ref="shop.catalog"/, 'nor has a pinned element');
  assert.doesNotMatch(html, /map-scope-btn[^>]*disabled/, 'no button is drawn disabled');
  const actionsOf = (ref) => html.match(new RegExp('data-ref="' + ref.replace(/\./g, '\\.') + '" aria-pressed="[a-z]+" aria-label="[^"]*"', 'g')).map((m) => m.includes('Pin') || m.includes('pin') ? 'pin' : 'hide');
  assert.deepEqual(actionsOf('mailer'), ['hide', 'pin'], 'Pin comes last, at the same place whether Hide is there or not');
  assert.deepEqual(actionsOf('shop.catalog'), ['pin']);
  assert.match(html, /data-action="map-pin" data-ref="mailer" aria-pressed="false" aria-label="Pin Mail Provider"/);
  assert.ok(html.includes('class="tree-node-label" title="Mail Provider"') && html.includes('class="tree-node-kind" title="system">SYS<'), 'a long name can be read in full, the kind is short');
  assert.ok(!/>\s*(Pin|Hide)\s*</.test(html), 'the buttons are icons, they leave the room to the name');
  assert.ok(html.includes('class="map-scope-mark"') && html.includes('title="Pinned"'), 'a pinned element is marked without hovering');
  // each toggle draws the state it is in
  assert.match(html, /aria-label="Unpin Catalog"[^>]*><svg[^>]*><path[^>]*fill="currentColor"\/><\/svg>/, 'pinned: the pin is filled');
  assert.match(html, /aria-label="Pin Mail Provider"[^>]*><svg[^>]*><path[^>]*fill="none"/, 'not pinned: the pin is an outline');
  assert.match(html, /aria-label="Show Mail Provider"[^>]*><svg[^>]*>.*?M2\.5 13\.5l11-11/, 'hidden: the eye is crossed');

  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  click('toggle-element', { 'data-ref': 'shop.catalog' });
  assert.equal(state.selection.key, 'shop.catalog', 'folding does not change the selection');
  assert.equal(state.expanded.has('shop.catalog'), true);
  click('map-hide', { 'data-ref': 'mailer' });
  assert.equal(run(sandbox, 'mapHidden.length'), 0, 'Hide on a hidden element brings it back');
});

test('the tree of the Map is a tree for the keyboard and the screen reader, with one tab stop', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'map'; mapOpened = null; mapPinned = ['shop.catalog']; mapHidden = ['mailer']; navActiveRef = null;");
  state.expanded.add('shop');
  const html = sandbox.renderMapScopeHtml();
  assert.match(html, /role="tree" aria-label="[^"]+"/);
  assert.equal((html.match(/role="treeitem"/g) || []).length, (html.match(/class="tree-node-row map-scope-row/g) || []).length, 'every row is an item');
  assert.match(html, /data-node="shop"[^>]*>/);
  assert.match(html, /map-scope-row foldable" role="treeitem" style="--level:1" aria-level="1" aria-expanded="true" aria-owns="map-scope-group-application-shop"/, 'a branch says it is open and what it holds');
  assert.match(html, /role="treeitem" style="--level:2" aria-level="2" aria-expanded="false"/, 'a closed branch says so, one level down');
  assert.match(html, /role="group" id="map-scope-group-application-shop"/);
  assert.equal((html.match(/class="tree-node-row[^"]*" role="treeitem"[^>]*tabindex="0"/g) || []).length, 1, 'one tab stop for the whole tree');
  assert.match(html, /data-node="customer"[^>]*>/);
  assert.match(html.match(/<div class="tree-node-row[^>]*data-node="customer"[^>]*>/)[0], /tabindex="0"/, 'the first row by default');
  assert.match(html, /aria-label="Mail Provider, hidden"/, 'the state is read, not only drawn');
  assert.match(html, /aria-label="Catalog, pinned"/);
  assert.ok((html.match(/<button type="button" tabindex="-1" class="map-scope-btn"/g) || []).length >= 3, 'the buttons are out of the tab order: the keyboard has the row');
  run(sandbox, "navActiveRef = 'shop.web';");
  assert.match(sandbox.renderMapScopeHtml().match(/<div class="tree-node-row[^>]*data-node="shop\.web"[^>]*>/)[0], /tabindex="0"/, 'the row the user was on keeps the tab stop');
  run(sandbox, "navActiveRef = 'shop.gone';");
  assert.equal((sandbox.renderMapScopeHtml().match(/tabindex="0"/g) || []).length, 1, 'a row that is gone gives the stop back to the first one');
});

test('the tree of the Map greys the elements the drawn map leaves out, and unfolds the way to a pinned element', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'map'; mapOpened = null; mapPinned = []; mapHidden = ['mailer'];");
  state.expanded.add('shop');
  const row = (html, ref) => html.match(new RegExp('<div class="tree-node-row[^>]*data-node="' + ref.replace(/\./g, '\\.') + '"[^>]*>'))[0];
  // nothing drawn yet, or the drawing of an element: no row is said to be off the map
  run(sandbox, "diagramScene = { viewKey: 'shop|overview||', boxes: { shop: {} } };");
  assert.doesNotMatch(sandbox.renderMapScopeHtml(), /off-map/);
  // the drawing of the map: the boxes it has, and what is inside them is on it too
  run(sandbox, "diagramScene = { viewKey: 'map|overview||shop.catalog', boxes: { 'shop': {}, 'customer': {} }, expandable: ['shop'] };");
  let html = sandbox.renderMapScopeHtml();
  assert.doesNotMatch(row(html, 'customer'), /off-map/);
  assert.doesNotMatch(row(html, 'shop.payments'), /off-map/, 'inside a box that is folded');
  assert.doesNotMatch(row(html, 'mailer'), /off-map/, 'a hidden element is struck through, not greyed twice');
  run(sandbox, "diagramScene = { viewKey: 'map|overview||', boxes: { 'shop': {}, 'shop.catalog': {} }, expandable: [] };");
  assert.match(row(sandbox.renderMapScopeHtml(), 'shop.web'), /off-map/, 'an open box shows some of what is inside it: the rest is out');
  run(sandbox, "diagramScene = { viewKey: 'map|overview||shop.catalog', boxes: { 'shop.catalog': {} }, expandable: [] };");
  html = sandbox.renderMapScopeHtml();
  assert.match(row(html, 'customer'), /off-map[^>]*title="Not on the map right now"/);
  assert.match(row(html, 'customer'), /aria-label="Customer, not on the map"/);
  assert.doesNotMatch(row(html, 'shop.catalog'), /off-map/);
  assert.match(html, /Greyed rows are not on the map/, 'the hint says what grey means');

  // pinning (or opening a pinned link) shows the row of the element
  state.expanded.clear();
  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  click('map-pin', { 'data-ref': 'shop.catalog' });
  assert.equal(state.expanded.has('shop'), true, 'the branch above a pinned element is unfolded');
  assert.equal(state.expanded.has('shop.catalog'), false, 'the element itself is left as it was');
  state.expanded.clear();
  run(sandbox, 'mapPinned = [];');
  sandbox.location.hash = '#/map?pin=shop.web';
  sandbox.syncPerspectiveFromHash();
  assert.equal(state.expanded.has('shop'), true, 'also when the pin comes from the URL');
});

test('the tree of Elements is a tree too: short kinds with their title, a dot for what is modified, one tab stop, the selection announced', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'elements'; navActiveRef = null; diagramFacet = null; elementTab = 'details';");
  state.expanded.clear();
  state.expanded.add('shop');
  state.expanded.add('shop.web');
  state.selection = { kind: 'element', key: 'shop.web', mode: 'view' };
  state.dirtyReferences.add('shop.payments');
  const html = sandbox.renderElementsNavHtml(true);
  const row = (ref) => html.match(new RegExp('<div class="tree-node-row[^>]*data-node="' + ref.replace(/\./g, '\\.') + '"[^>]*>'))[0];
  assert.equal((html.match(/role="tree"/g) || []).length, 2, 'Applications and Environments are two trees');
  assert.match(row('shop.web'), /aria-selected="true"/);
  assert.match(row('shop.payments'), /aria-selected="false"/);
  assert.match(row('shop.web'), /aria-expanded="true"/);
  assert.match(row('shop.web.frontend'), /style="--level:3" aria-level="3"/, 'the depth is the padding of the row, not a margin around the branch');
  assert.doesNotMatch(row('customer'), /aria-expanded/, 'a leaf has nothing to expand');
  assert.match(row('shop.payments'), /aria-label="Payment Provider, modified"/);
  assert.match(html, /<span class="tree-node-kind" title="person">PRS<\/span>/, 'the kind is short, its title says it in full');
  assert.match(html, /class="tree-node-label" title="Payment Provider"/, 'a name that is cut can still be read');
  assert.match(html, /class="modified-dot"[^>]*title="This element has unsaved changes"/);
  assert.doesNotMatch(html, />modified</, 'a dot, not a word that takes the room of the name');
  assert.equal((html.match(/role="treeitem"[^>]*tabindex="0"/g) || []).length, 1, 'one tab stop for both trees');
  assert.match(row('shop.web'), /tabindex="0"/, 'on the selected row, when the user was on none');
  assert.match(html, /aria-label="Add an element to Applications"/);
  assert.equal(sandbox.kindAbbreviation('container-group'), 'GRP');
  assert.equal(sandbox.kindAbbreviation('environment'), 'ENV');
  assert.equal(sandbox.kindAbbreviation('node'), 'NOD');
  // a facet greys rows: the tree says why, and how to get rid of it
  run(sandbox, "elementTab = 'overview'; diagramFacet = 'no-smtp';");
  assert.match(sandbox.renderElementsNavHtml(true), /Greyed: nothing to draw through “no-smtp”\. <button type="button" data-action="clear-facet">Clear facet<\/button>/);
  run(sandbox, "diagramFacet = null;");
  assert.doesNotMatch(sandbox.renderElementsNavHtml(true), /nav-facet-note/);
  // a selection that does not come from the tree is brought into view in it
  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  run(sandbox, 'scrollNavToSelection = false;');
  click('select-element', { 'data-ref': 'shop.catalog' });
  assert.equal(run(sandbox, 'scrollNavToSelection'), false, 'a click in the tree does not move it under the pointer');
  click('goto-element', { 'data-ref': 'shop.web' });
  assert.equal(run(sandbox, 'scrollNavToSelection'), true, 'a click on a box of a diagram does');
});

test('the toolbars of Elements say what their controls are, keep the focus across a redraw and find their words', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'overview'; diagramMaximized = false; diagramFacet = null;");
  state.selection = { kind: 'element', key: 'shop', mode: 'view' };
  const page = sandbox.renderElementsPerspectiveHtml().center;
  assert.match(page, /role="group" aria-label="View of this element"/, 'the tabs are a group of views, said honestly');
  assert.match(page, /data-action="toggle-maximize" aria-label="Maximize"/);
  assert.doesNotMatch(page.match(/<button[^>]*toggle-maximize[^>]*>/)[0], /aria-pressed/, 'the label says the state, the button is not also pressed');
  assert.doesNotMatch(page.match(/<button[^>]*diagram-center-button[^>]*>/)[0], /aria-pressed/, 'Center is an action, lit while its framing holds');
  assert.match(page, /id="diagram-zoom-label" data-action="diagram-zoom" data-dir="reset" aria-label="Actual size"/);
  assert.match(page, /diagram-tools-sep[^]*data-action="diagram-export"/, 'the export is set apart from the zoom and the framing');
  assert.match(page, />Show on map</);
  // the map leads back to the diagram of the element, and the element is not dressed as a kind
  run(sandbox, "currentPerspective = 'map';");
  const map = sandbox.renderMapPerspectiveHtml().center;
  assert.match(map, />Open in Elements</);
  assert.match(map, /class="element-header-subject"/);
  assert.doesNotMatch(map, /element-kind-badge/);
  // the control that had the focus is found again once the page is rebuilt
  const control = (attrs, id) => ({ id: id || '', closest: () => ({ id: id || '', disabled: false, getAttribute: (name) => attrs[name] || null }) });
  assert.equal(sandbox.headerControlSelector(control({ 'data-action': 'set-element-tab', 'data-tab': 'deep' })), '[data-action="set-element-tab"][data-tab="deep"]');
  assert.equal(sandbox.headerControlSelector(control({}, 'diagram-facet-select')), '#diagram-facet-select');
  assert.equal(sandbox.headerControlSelector(control({ 'data-action': 'diagram-zoom', 'data-dir': 'fit' })), '[data-action="diagram-zoom"][data-dir="fit"]');
  assert.equal(sandbox.headerControlSelector({ closest: () => null }), null, 'a control outside the headers keeps nothing');
  // a person has nothing inside it: no hint to look inside, and the URL says the tab that is shown
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'detailed';");
  state.selection = { kind: 'element', key: 'customer', mode: 'view' };
  assert.match(sandbox.currentRouteHash(), /tab=overview/, 'a leaf asked for Detailed shows its Overview, and the link says so');
  state.selection = { kind: 'element', key: 'shop', mode: 'view' };
  assert.match(sandbox.currentRouteHash(), /tab=detailed/);
});

test('each tree of the navigations can unfold and fold all its branches, and nothing else', async () => {
  const { sandbox, state } = await openFixture();
  const click = (action, attrs) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : (attrs || {})[name] || null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  run(sandbox, "mapOpened = null; mapPinned = [];");

  // Elements: one pair of buttons in the header of each tree
  run(sandbox, "currentPerspective = 'elements';");
  const nav = sandbox.renderElementsNavHtml(false);
  assert.equal((nav.match(/data-action="nav-unfold-all"/g) || []).length, 2, 'Applications and Environments each have Unfold all');
  assert.equal((nav.match(/data-action="nav-fold-all"/g) || []).length, 2, 'and Fold all');
  assert.match(nav, /data-action="nav-fold-all" data-layer="technology" data-branch="environments"/);
  assert.match(nav, /aria-label="Fold every branch of Environments"/, 'the two pairs are told apart');
  state.expanded.clear();
  click('nav-unfold-all', { 'data-layer': 'application', 'data-branch': 'applications' });
  assert.equal(state.expanded.has('shop'), true, 'every parent of the tree is unfolded');
  assert.equal(state.expanded.has('shop.web'), true, 'at every depth');
  assert.equal(state.expanded.has('customer'), false, 'a leaf has nothing to unfold');
  assert.equal(state.expanded.has('production'), false, 'the other tree is left as it was');
  assert.equal(run(sandbox, 'treeExpandedApplications'), true);
  assert.equal(run(sandbox, 'mapOpened === null || mapOpened.size === 0'), true, 'the boxes of the map are not touched');
  click('nav-fold-all', { 'data-layer': 'application', 'data-branch': 'applications' });
  assert.equal(state.expanded.has('shop'), false);
  assert.equal(state.expanded.has('shop.web'), false);
  assert.equal(run(sandbox, 'treeExpandedApplications'), false, 'the tree itself folds, down to its header');
  assert.equal(run(sandbox, 'treeExpandedEnvironments'), true, 'the other one stays open');
  click('nav-unfold-all', { 'data-layer': 'technology', 'data-branch': 'environments' });
  assert.equal(run(sandbox, 'treeExpandedEnvironments'), true);
  assert.ok(Array.from(state.expanded).some((reference) => state.index.technology.has(reference)), 'the environments are unfolded');
  click('nav-fold-all', { 'data-layer': 'technology', 'data-branch': 'environments' });
  assert.equal(run(sandbox, 'treeExpandedEnvironments'), false);

  // Map: one pair, for its one tree
  run(sandbox, "currentPerspective = 'map'; treeExpandedApplications = true;");
  state.expanded.clear();
  const map = sandbox.renderMapScopeHtml();
  assert.equal((map.match(/data-action="nav-unfold-all"/g) || []).length, 1);
  click('nav-unfold-all', { 'data-layer': 'application' });
  assert.equal(state.expanded.has('shop.web'), true);
  click('nav-fold-all', { 'data-layer': 'application' });
  assert.equal(state.expanded.has('shop'), false);
  assert.equal(run(sandbox, 'treeExpandedApplications'), true, 'the Map has no header of its tree to fold');
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

test('the pinned and hidden chips float over the map, with Clear all once there are more than two', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'map'; mapPinned = ['shop.web']; mapHidden = ['mailer'];");
  state.selection = { kind: 'none', key: null, mode: 'view' };
  const center = sandbox.renderMapPerspectiveHtml().center;
  const stage = center.slice(center.indexOf('<div class="diagram-stage">'));
  assert.ok(stage.indexOf('class="map-chips"') > -1 && stage.indexOf('class="map-chips"') < stage.indexOf('id="diagram-canvas"'), 'inside the stage, over the canvas');
  assert.ok(!center.slice(0, center.indexOf('<div class="diagram-stage">')).includes('map-chips'), 'no band between the header and the map');
  assert.ok(!center.includes('map-chips-clear'), 'two chips: no Clear all');

  run(sandbox, "mapHidden = ['mailer', 'customer'];");
  assert.ok(sandbox.renderMapPerspectiveHtml().center.includes('data-action="map-clear"'));
  const target = { getAttribute: (name) => (name === 'data-action' ? 'map-clear' : null) };
  sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  assert.equal(run(sandbox, 'mapPinned.length + mapHidden.length'), 0);
  assert.ok(!sandbox.renderMapPerspectiveHtml().center.includes('map-chips'));
});

test('on the map, an element that is no longer drawn is not shown as selected: no name beside the title, no Open in Elements', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'map'; mapOpened = null;");
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  const removed = [];
  const canvas = { hasAttribute: (name) => name === 'data-map', innerHTML: '', querySelectorAll: () => [], querySelector: () => null, getAttribute: () => null, closest: () => null, clientWidth: 800, clientHeight: 600, scrollTo() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} } };
  const document = sandbox.document;
  const saved = { getElementById: document.getElementById, querySelectorAll: document.querySelectorAll };
  document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : saved.getElementById.call(document, id));
  document.querySelectorAll = (selector) => (selector.includes('element-header-subject') ? [{ remove: () => removed.push('el') }, { remove: () => removed.push('el') }] : []);
  try {
    const scene = (boxes) => ({ html: '', status: '', legend: '', width: 10, height: 10, viewKey: 'map', boxes });
    sandbox.showDiagramScene(scene({ 'shop.web': { x: 1, y: 1, w: 1, h: 1 } }));
    assert.equal(removed.length, 2, 'folded away: the selection is not on the map');
    removed.length = 0;
    sandbox.showDiagramScene(scene({ 'shop.web.api': { x: 1, y: 1, w: 1, h: 1 } }));
    assert.equal(removed.length, 0, 'drawn: still the selection of the map');
    sandbox.showDiagramScene(scene(undefined));
    assert.equal(removed.length, 0, 'an error or an empty map says nothing about the selection');
  } finally {
    Object.assign(document, saved);
  }
});
