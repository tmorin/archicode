'use strict';
// The editor draws the highlight the kernel marks (wave 026, run 0200, issue #143, TDD DEC-3 and DEC-4; REQ-1, REQ-7, REQ-8): a link with `highlighted` is heavy (`dg-hl`), carries a `▶` and a
// bold caption and says so to a screen reader; when a diagram has a highlighted link the others are calmer (`dg-calm`); a compared link keeps its state; selection and focus win; a diagram
// with no highlighted link is drawn byte for byte as before. RED until `renderDiagramSvg` and the style know the class. The links are built by hand (a fake layout, as the other diagram tests do)
// and drawn from the real kernel on the bookshop of the manual.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./viewpoint-kernel/harness');
const {
  REPO,
  BOOKSHOP,
  BRIGHTCART,
  entry,
  run,
  plain,
  openWorkspace,
  addMapView,
  openViewPage,
  boxIdsOf,
  linkPairsOf
} = require('./map-links-support');

const HTML = fs.readFileSync(path.join(REPO, 'src/main/resources/editor-webapp/standalone.html'), 'utf8');

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
const link = (from, to, label, extra) =>
  Object.assign(
    { from, to, label, qualifiers: [], tags: {}, synthetic: false, secondary: false, relationships: [] },
    extra || {}
  );
function draw(sandbox, links, options) {
  const result = {
    items: ['a', 'b', 'c', 'd'].map((id) => ({ id, reference: id, parent: null })),
    links: plain(links)
  };
  return sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '', options).html;
}
/** The markup of the group of the link from `from` to `to`, and the label text that belongs to it. */
const groupOf = (html, from, to) =>
  (new RegExp('<g class="dg-link"[^>]*data-from="' + from + '" data-to="' + to + '"[\\s\\S]*?</g>').exec(html) || [
    ''
  ])[0];
const labelOf = (html, from, to) =>
  (new RegExp('<text class="dg-label[^"]*"[^>]*data-from="' + from + '" data-to="' + to + '"[\\s\\S]*?</text>').exec(
    html
  ) || [''])[0];
const edgeClass = (group) => (/<path class="(dg-edge[^"]*)"/.exec(group) || ['', ''])[1];

test('a highlighted link is heavy, marked with the glyph and the bold caption, and says it to a screen reader', () => {
  const sandbox = createApp({});
  const html = draw(sandbox, [link('a', 'b', 'calls', { highlighted: true }), link('b', 'c', 'reads')]);
  const hl = groupOf(html, 'a', 'b');
  assert.match(edgeClass(hl), /\bdg-hl\b/);
  assert.doesNotMatch(edgeClass(hl), /\bdg-calm\b/);
  assert.match(hl, /marker-end="url\(#dg-arrow-hl\)"/);
  assert.match(hl, /aria-label="[^"]*calls, highlighted"/);
  assert.match(hl, /<title>[^<]*highlighted/i);
  const label = labelOf(html, 'a', 'b');
  assert.match(label, /\bdg-hl\b/);
  assert.match(label, /▶/, 'the glyph opens the caption');
  assert.match(html, /<marker id="dg-arrow-hl"/, 'the head is defined when something is highlighted');
});

test('when something is highlighted the other links are calmer, and keep their caption', () => {
  const sandbox = createApp({});
  const html = draw(sandbox, [link('a', 'b', 'calls', { highlighted: true }), link('b', 'c', 'reads')]);
  const calm = groupOf(html, 'b', 'c');
  assert.match(edgeClass(calm), /\bdg-calm\b/);
  assert.doesNotMatch(edgeClass(calm), /\bdg-hl\b/);
  assert.match(labelOf(html, 'b', 'c'), /\bdg-calm\b/);
  assert.match(labelOf(html, 'b', 'c'), />reads</);
  assert.doesNotMatch(labelOf(html, 'b', 'c'), /▶/);
  assert.doesNotMatch(calm, /highlighted/);
});

test('an aggregated link that is not highlighted is not made calm, and a compared one is not either', () => {
  const sandbox = createApp({});
  const html = draw(sandbox, [
    link('a', 'b', 'calls', { highlighted: true }),
    link('b', 'c', 'groups', { synthetic: true }),
    link('c', 'd', 'moves', { change: 'changed' })
  ]);
  assert.doesNotMatch(edgeClass(groupOf(html, 'b', 'c')), /\bdg-calm\b/);
  assert.doesNotMatch(edgeClass(groupOf(html, 'c', 'd')), /\bdg-calm\b/);
});

test('a compared link keeps its state and its head when it is highlighted, and the weight is the highlight’s', () => {
  const sandbox = createApp({});
  const html = draw(sandbox, [
    link('a', 'b', 'calls', { highlighted: true, change: 'new' }),
    link('b', 'c', 'reads', { change: 'new' })
  ]);
  const hl = groupOf(html, 'a', 'b');
  assert.match(edgeClass(hl), /\bdg-chg-new\b/);
  assert.match(edgeClass(hl), /\bdg-hl\b/);
  assert.match(hl, /marker-end="url\(#dg-arrow-new\)"/, 'the head keeps the state, not dg-arrow-hl');
  assert.match(hl, /new/, 'the aria text says the state too');
  assert.match(hl, /highlighted/);
  const other = groupOf(html, 'b', 'c');
  assert.doesNotMatch(edgeClass(other), /\bdg-hl\b/);
  assert.match(edgeClass(other), /\bdg-chg-new\b/);
});

test('the label layout measures the glyph, and a link with no caption has the glyph alone', () => {
  const sandbox = createApp({});
  const layout = (l, markOnly) =>
    plain(run(sandbox, 'diagramLabelLayout(' + JSON.stringify(l) + ', false, ' + !!markOnly + ')'));
  const plainLayout = layout(link('a', 'b', 'calls'));
  const marked = layout(link('a', 'b', 'calls', { highlighted: true }));
  assert.ok(marked.lines[0].startsWith('▶'), marked.lines[0]);
  assert.ok(marked.width > plainLayout.width, 'the box is sized for the glyph');
  const bare = layout(link('a', 'b', '', { highlighted: true }));
  assert.deepEqual(bare.lines, ['▶']);
});

test('a diagram with no highlighted link is the diagram of before: no class, no marker, no glyph', () => {
  const sandbox = createApp({});
  const links = [link('a', 'b', 'calls'), link('b', 'c', 'reads', { change: 'new' })];
  const html = draw(sandbox, links);
  assert.doesNotMatch(html, /dg-hl|dg-calm|dg-arrow-hl|▶|highlighted/);
  assert.equal(
    draw(
      sandbox,
      links.map((l) => Object.assign({}, l, { highlighted: false }))
    ),
    html
  );
});

test('the style: heavy and calm, a selection and a focus keep their accent, and the colours are in both themes with a contrast', () => {
  const style = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
  assert.match(style, /\.dg-edge\.dg-hl\s*\{[^}]*stroke:\s*var\(--hl\)/);
  assert.match(style, /\.dg-label\.dg-hl\s*\{[^}]*font-weight:\s*700/);
  assert.match(style, /\.dg-edge\.dg-calm\s*\{/);
  assert.match(style, /\.dg-arrowhead\.dg-hl\s*\{/);
  const at = (pattern) => style.search(pattern);
  assert.ok(
    at(/\.dg-edge\.dg-hl\s*\{/) < at(/\.dg-link-selected \.dg-edge\s*\{/),
    'selection is declared after, so it wins'
  );
  assert.ok(at(/\.dg-edge\.dg-hl\s*\{/) < at(/\.dg-link:focus-visible \.dg-edge\s*\{/), 'and so is the focus');
  const light = style.slice(style.indexOf(':root {'), style.indexOf('@media (prefers-color-scheme: dark)'));
  const dark = /:root\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(style)[1];
  const media = /:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/.exec(style)[1];
  const hex = (block, name) => (new RegExp(name + ':\\s*(#[0-9a-fA-F]{6})').exec(block) || [null, null])[1];
  const lum = (h) => {
    const [r, g, b] = [1, 3, 5]
      .map((k) => parseInt(h.slice(k, k + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  for (const [theme, block, bg] of [
    ['light', light, hex(light, '--bg')],
    ['dark (system)', media, hex(media, '--bg')],
    ['dark (forced)', dark, hex(dark, '--bg')]
  ]) {
    assert.ok(hex(block, '--hl') && hex(block, '--hl-text'), theme + ': --hl and --hl-text are defined');
    assert.ok(ratio(hex(block, '--hl'), bg) >= 3, theme + ': the line is 3:1 on the ground');
    assert.ok(ratio(hex(block, '--hl-text'), bg) >= 4.5, theme + ': the caption is 4.5:1 on the ground');
  }
});

// ============================================================ from the kernel

const ORDERS = entry('customer', 'shop.web', 'orders on');
const READS = entry('shop.web', 'shop.catalog', 'reads');
const PAYS = entry('shop.web', 'shop.payments', 'pays with');
const highlighted = (html) =>
  Array.from(html.matchAll(/<g class="dg-link"[^>]*data-from="([^"]*)" data-to="([^"]*)"[^>]*>[\s\S]*?<\/g>/g))
    .filter((m) => /class="dg-edge[^"]*\bdg-hl\b/.test(m[0]))
    .map((m) => m[1] + ' -> ' + m[2])
    .sort();

test('the page of a view draws dg-hl on exactly the link the view highlights, the page Applications too', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const view = addMapView(page, 'flow', { opened: ['shop'], links: [ORDERS, READS], highlight: [READS] });
  await openViewPage(page, view);
  const html = page.scene().html;
  assert.deepEqual(linkPairsOf(html), ['customer -> shop.web', 'shop.web -> shop.catalog']);
  assert.deepEqual(highlighted(html), ['shop.web -> shop.catalog']);
  assert.match(edgeClass(groupOf(html, 'customer', 'shop.web')), /\bdg-calm\b/);
  assert.equal(page.sandbox.applySavedView(page.sandbox.findSavedView(view.id)), null);
  await page.show();
  assert.deepEqual(highlighted(page.scene().html), ['shop.web -> shop.catalog']);
});

test('a highlight that names a relationship the map does not draw marks nothing, and nothing is calm', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const view = addMapView(page, 'off', { opened: ['shop'], links: [ORDERS], highlight: [READS] });
  await openViewPage(page, view);
  const html = page.scene().html;
  assert.deepEqual(highlighted(html), []);
  assert.doesNotMatch(html, /dg-calm|dg-arrow-hl/);
});

test('with a comparison on, a new link that is highlighted keeps its state', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  page.sandbox.drawPlateau('to-be', { compare: 'past' });
  const view = addMapView(page, 'cmp', { opened: ['shop'], links: [PAYS, READS], highlight: [PAYS] });
  await openViewPage(page, view);
  const html = page.scene().html;
  const group = groupOf(html, 'shop.web', 'shop.payments');
  assert.match(edgeClass(group), /dg-chg-new/);
  assert.match(edgeClass(group), /\bdg-hl\b/);
  assert.doesNotMatch(edgeClass(groupOf(html, 'shop.web', 'shop.catalog')), /\bdg-hl\b/);
});

test('a grouped link that stands for a highlighted relationship is drawn highlighted whole', async () => {
  const page = await openWorkspace(BRIGHTCART, 'baseline');
  const view = addMapView(page, 'grouped', {
    opened: ['shop'],
    links: [entry('shop.web', 'shop.app', 'calls')],
    highlight: [entry('shop.web', 'shop.app', 'calls')]
  });
  await openViewPage(page, view);
  assert.deepEqual(highlighted(page.scene().html), ['shop.web -> shop.app']);
});

test('a Map with no highlight is the same drawing with an empty one: the SVG of the shipped Maps is the SVG of before', async () => {
  for (const [dir, plateau] of [
    [BOOKSHOP, 'baseline'],
    [BRIGHTCART, 'baseline']
  ]) {
    const page = await openWorkspace(dir, plateau);
    const views = plain(
      run(
        page.sandbox,
        "savedViews().filter((v) => v.viewpoint === 'map' && v.layer !== 'technology').map((v) => v.id)"
      )
    );
    const own = [
      addMapView(page, 'plain_a', { opened: ['shop'] }),
      addMapView(page, 'plain_b', { opened: ['shop'], highlight: [] })
    ];
    await openViewPage(page, own[0]);
    const without = page.scene().html;
    await openViewPage(page, own[1]);
    assert.equal(page.scene().html, without, path.basename(dir) + ': highlight: [] draws what no highlight draws');
    assert.doesNotMatch(without, /dg-hl|dg-calm|dg-arrow-hl|▶/);
    for (const id of views) {
      await openViewPage(page, page.sandbox.findSavedView(id));
      const scene = page.scene();
      if (scene) assert.doesNotMatch(scene.html, /dg-hl|dg-calm|dg-arrow-hl|▶/, id);
    }
    assert.ok(boxIdsOf(without).length > 0);
  }
});
