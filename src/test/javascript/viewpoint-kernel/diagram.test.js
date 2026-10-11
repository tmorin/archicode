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

test('the URL carries the viewpoint and the facet of a diagram, and restores them', async () => {
  const { sandbox, state } = await openFixture();
  run(sandbox, "currentPerspective = 'diagram'; diagramViewpoint = 'deep'; diagramFacet = 'no-smtp';");
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  assert.equal(sandbox.currentRouteHash(), '/diagram?ref=shop.web.api&vp=deep&facet=no-smtp');

  run(sandbox, "diagramViewpoint = 'overview'; diagramFacet = null;");
  assert.equal(sandbox.currentRouteHash(), '/diagram?ref=shop.web.api', 'the defaults stay out of the URL');

  sandbox.location.hash = '#/diagram?ref=shop.web.api&vp=detailed&facet=rest-only';
  sandbox.syncPerspectiveFromHash();
  assert.equal(run(sandbox, 'diagramViewpoint'), 'detailed');
  assert.equal(run(sandbox, 'diagramFacet'), 'rest-only');

  sandbox.location.hash = '#/diagram?ref=shop.web.api&vp=sideways&facet=nope';
  sandbox.syncPerspectiveFromHash();
  assert.equal(run(sandbox, 'diagramViewpoint'), 'overview', 'an unknown viewpoint falls back');
  assert.equal(run(sandbox, 'diagramFacet'), null, 'an unknown facet falls back');

  run(sandbox, "diagramViewpoint = 'deep';");
  sandbox.location.hash = '#/elements?ref=shop.web.api';
  sandbox.syncPerspectiveFromHash();
  assert.equal(run(sandbox, 'diagramViewpoint'), 'deep', 'other perspectives leave the diagram choices alone');
});

test('the header offers the viewpoints and the facets of the workspace', async () => {
  const { sandbox, state } = await openFixture();
  const leaf = state.index.application.get('shop.catalog.service.search');
  const parent = state.index.application.get('shop.catalog');
  assert.match(sandbox.renderViewpointSwitchHtml(leaf), /data-viewpoint="detailed"[^>]*disabled/);
  assert.doesNotMatch(sandbox.renderViewpointSwitchHtml(parent), /data-viewpoint="detailed"[^>]*disabled/);
  run(sandbox, "diagramViewpoint = 'detailed';");
  assert.equal(sandbox.effectiveDiagramViewpoint(leaf), 'overview');

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

test('the SVG: clickable boxes, the focal one marked, fold buttons, grouped links explain themselves', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input);
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, 'shop.web.api');
  const svg = drawing.html;
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('data-action="goto-element"') && svg.includes('dg-focal'));
  assert.ok(svg.includes('data-action="toggle-fold"'), 'a box that contains others can be folded');
  assert.equal((svg.match(/<g class="dg-link"/g) || []).length, result.links.length);
  assert.ok(svg.includes('relationships are grouped here') || svg.includes('relationship is grouped here'), 'a grouped link lists what it stands for');
  assert.ok(drawing.focal && drawing.focal.x > 0, 'the focal box is located, to center on it');
  assert.doesNotMatch(svg, /<script|onclick=/i);
});

test('a folded box is drawn as a box that says how much it hides, with a button to unfold it', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('deep', 'shop.catalog', { collapsed: ['shop.catalog.service'] }).input);
  const svg = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, 'shop.catalog').html;
  assert.match(svg, /2 hidden/);
  assert.match(svg, /aria-label="Unfold Catalog Service"/);
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

test('overview: a box that hides children can be opened, the boxes around the focal one have no fold button', async () => {
  const { sandbox, kernel } = await openFixture();
  const draw = (expanded) => {
    const result = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api', { expanded }).input);
    return { result, svg: sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, 'shop.web.api').html };
  };

  const closed = draw([]);
  const catalog = closed.result.items.find((i) => i.id === 'shop.catalog');
  assert.equal(catalog.expandable, true, 'the catalog has components the view does not show');
  assert.match(closed.svg, /data-mode="expand" data-id="shop.catalog"/);
  assert.doesNotMatch(closed.svg, /data-id="shop"[^>]*role="button"|data-mode="fold" data-id="shop(\.web)?"/, 'a box around the focal one is not foldable');

  const opened = draw(['shop.catalog']);
  assert.ok(opened.result.items.some((i) => i.parent === 'shop.catalog'), 'its children are shown');
  assert.ok(opened.result.links.every((l) => l.to !== 'shop.catalog'), 'the links now end on the children');
  assert.ok(opened.result.items.find((i) => i.id === 'shop.catalog').expandable === false);
});

test('the fold button opens, closes, folds and unfolds', async () => {
  const { sandbox } = await openFixture();
  const click = (id, mode) => {
    const target = { getAttribute: (name) => ({ 'data-action': 'toggle-fold', 'data-id': id, 'data-mode': mode })[name] };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  const state = () => JSON.parse(vm.runInContext('JSON.stringify([Array.from(diagramExpanded), Array.from(diagramCollapsed)])', sandbox));
  click('shop.catalog', 'expand');
  click('shop.catalog.service', 'expand');
  assert.deepEqual(state(), [['shop.catalog', 'shop.catalog.service'], []]);
  click('shop.catalog', 'close');
  assert.deepEqual(state(), [[], []], 'closing a box closes what was opened in it');
  click('shop.web', 'fold');
  assert.deepEqual(state(), [[], ['shop.web']]);
  click('shop.web', 'unfold');
  assert.deepEqual(state(), [[], []]);
});

test('the Elements perspective shows the overview of the element, whatever the Diagram perspective is set to', async () => {
  const { sandbox } = await openFixture();
  run(sandbox, "diagramViewpoint = 'deep'; diagramFacet = 'no-smtp';");
  const html = sandbox.renderElementViewHtml('shop.web.api');
  assert.match(html, /<div class="element-diagram">/);
  assert.match(html, /id="diagram-canvas" data-viewpoint="overview"/);
  assert.match(html, /data-perspective="diagram"[^>]*>Open in Diagram</, 'the other viewpoints are one click away');
  assert.doesNotMatch(html, /diagram-facet-select/, 'no facet picker next to a diagram that ignores facets');
  // and the Diagram perspective's own canvas is not pinned to the overview
  assert.doesNotMatch(sandbox.renderDiagramCanvasHtml({ name: 'API', id: 'api', reference: 'shop.web.api' }), /data-viewpoint/);
});

test('the toolbar folds everything that can be folded and unfolds it again, one level at a time', async () => {
  const { sandbox, kernel } = await openFixture();
  const sets = () => JSON.parse(vm.runInContext('JSON.stringify([Array.from(diagramExpanded), Array.from(diagramCollapsed)])', sandbox));
  const click = (action) => {
    const target = { getAttribute: (name) => (name === 'data-action' ? action : null) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  const open = (focal) => {
    const result = kernel.compute(sandbox.buildKernelInput('overview', focal, {
      expanded: vm.runInContext('Array.from(diagramExpanded)', sandbox), collapsed: vm.runInContext('Array.from(diagramCollapsed)', sandbox)
    }).input);
    vm.runInContext('diagramScene = ' + JSON.stringify(sandbox.diagramFoldTargets(result, focal)), sandbox);
    return result;
  };

  open('shop.catalog.service');
  const targets = JSON.parse(vm.runInContext('JSON.stringify(diagramScene)', sandbox));
  assert.ok(!targets.foldable.includes('shop.catalog') && !targets.foldable.includes('shop'), 'the boxes around the focal one are left alone');

  open('shop.web.api');
  click('unfold-all');
  assert.deepEqual(sets()[0], ['shop.catalog', 'shop.web.edge'], 'every box that hides children is opened');
  open('shop.web.api');
  click('fold-all');
  assert.deepEqual(sets()[0], [], 'what was opened is closed');
  click('unfold-all');
  assert.deepEqual(sets()[1], [], 'nothing stays folded');

  // in a deep diagram the boxes inside the focal one can be folded, and folding them hides what they contain
  const deep = kernel.compute(sandbox.buildKernelInput('deep', 'shop').input);
  vm.runInContext('diagramScene = ' + JSON.stringify(sandbox.diagramFoldTargets(deep, 'shop')), sandbox);
  click('fold-all');
  const folded = sets()[1];
  assert.ok(folded.includes('shop.catalog') && !folded.includes('shop'), 'the focal box itself stays unfolded');
  const after = kernel.compute(sandbox.buildKernelInput('deep', 'shop', { collapsed: folded }).input);
  assert.ok(after.items.length < deep.items.length);
});

test('maximizing the diagram hides the panels around it, and only then', async () => {
  const { sandbox, state } = await openFixture();
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  run(sandbox, "currentPerspective = 'diagram'; diagramMaximized = false;");
  const normal = sandbox.renderDiagramPerspectiveHtml();
  assert.ok(normal.left && normal.right && normal.bottom);
  assert.match(normal.center, /data-action="toggle-maximize"[^>]*>Maximize</);

  run(sandbox, 'diagramMaximized = true;');
  const maximized = sandbox.renderDiagramPerspectiveHtml();
  assert.equal(maximized.left, null);
  assert.equal(maximized.right, null);
  assert.equal(maximized.bottom, null);
  assert.match(maximized.center, /data-action="toggle-maximize"[^>]*>Restore</);
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
