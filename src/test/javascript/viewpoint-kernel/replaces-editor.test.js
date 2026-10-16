'use strict';
// `replaces` in the editor (wave 009, run 0046). The Changes panel and the drawing know the three states of identity (moved, split, merged), tell what an
// element replaces and what replaced it, list the candidates the kernel proposes (never applied), write `replaces` on request ("Write replaces") through the
// same line-preserving edit as any other, let the author edit the list by hand, and show the warnings of the kernel. The kernel is the real embedded module;
// the harness has no DOM and no ELK, so the markup is checked from a fake layout and the look itself in a browser (see the run's document).
// The rules of `replaces` are proven by `cargo test` and by replaces.test.js; this is the page. Everything here is invented: a small library and its archive.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const text = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&rarr;/g, '→').replace(/&times;/g, '×').replace(/\s+/g, ' ').trim();

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

// ---- an invented library in two plateaus: one moved, two split, one merged, two candidates, two warnings ----

// every manifest has a comment before and after, a blank line and quoted strings: what a save must keep
const element = (kind, parent, id, name, extra) =>
  '# the manifest of ' + id + '\nheader:\n  kind: "archicode.morin.io/' + kind + '"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + '  version: "1"\n\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n' + (extra || '') + '# end of ' + id + '\n';
const LOANS_DESCRIPTION = '  description: "Records which member borrowed which book and when it is due."\n';
const RACK_DESCRIPTION = '  description: "Keeps the rare books in a cool dry room under watch."\n';

const BASE = {
  'app.library.yaml': element('system', null, 'library', 'Library'),
  'app.library.loans.yaml': element('container', 'library', 'loans', 'Loans', LOANS_DESCRIPTION),
  'app.library.fines.yaml': element('container', 'library', 'fines', 'Fines'),
  'app.library.catalog.yaml': element('container', 'library', 'catalog', 'Catalog'),
  'app.library.catalog.index.yaml': element('component', 'library.catalog', 'index', 'Index'),
  'app.library.desk.yaml': element('container', 'library', 'desk', 'Front desk'),
  'app.archive.yaml': element('system', null, 'archive', 'Archive'),
  'app.archive.rack.yaml': element('container', 'archive', 'rack', 'Rack', RACK_DESCRIPTION),
  'app.archive.shelf.yaml': element('container', 'archive', 'shelf', 'Shelf'),
  'app.archive.bin.yaml': element('container', 'archive', 'bin', 'Bin')
};
const TARGET = {
  'app.library.yaml': element('system', null, 'library', 'Library'),
  // nothing says it replaces the loans: a candidate (same description, the only two containers of the library that changed)
  'app.library.lending.yaml': element('container', 'library', 'lending', 'Lending', LOANS_DESCRIPTION),
  // unchanged, with a state written by hand on it
  'app.library.fines.yaml': element('container', 'library', 'fines', 'Fines', '  tags:\n    rendering-stereotypes: moved\n'),
  'app.library.catalog-a.yaml': element('container', 'library', 'catalog-a', 'Catalog of books', '  replaces:\n    - library.catalog\n'),
  'app.library.catalog-b.yaml': element('container', 'library', 'catalog-b', 'Catalog of films', '  replaces: [library.catalog, library.nowhere]\n'),
  'app.archive.yaml': element('system', null, 'archive', 'Archive'),
  // a replaces that points at nothing, written on one line: the kernel ignores it, and the rack is a candidate for this vault
  'app.archive.vault.yaml': element('container', 'archive', 'vault', 'Vault', RACK_DESCRIPTION + '  replaces: [archive.ghost]\n'),
  'app.archive.cabinet.yaml': element('container', 'archive', 'cabinet', 'Cabinet', '  replaces:\n    - archive.shelf\n    - archive.bin\n'),
  'app.archive.counter.yaml': element('container', 'archive', 'counter', 'Counter', '  replaces:\n    - library.desk\n')
};
const folder = (dir, files) => Object.fromEntries(Object.entries(files).map(([name, body]) => ['plateaus/' + dir + '/' + name, body]));
const PLATEAUS = '  plateaus:\n    - id: base\n      name: Base\n      path: plateaus/10_base\n    - id: target\n      name: Target\n      path: plateaus/20_target\n';
const target = (reference) => 'plateaus/20_target/app.' + reference + '.yaml';

/** The library opened as the editor opens a folder, the target drawn (it is the last), compared with the base unless `compare` is false. */
async function open(options = {}) {
  const files = Object.assign({ 'workspace.yaml': 'settings:\n' + PLATEAUS }, folder('10_base', options.base || BASE), folder('20_target', options.target || TARGET));
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  if (options.compare !== false) await sandbox.setCompareTo(options.compareTo || 'base');
  return { sandbox, state, mem, files };
}

/** A click as handleAppClick reads it: the nearest data-action element, with these attributes. */
function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}

/** The attributes of the first button of `html` whose opening tag holds `needle`. */
function attributesOf(html, needle) {
  const tag = html.match(new RegExp('<button[^>]*' + needle + '[^>]*>'))[0];
  const attributes = {};
  for (const m of tag.matchAll(/([a-z-]+)="([^"]*)"/g)) attributes[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return attributes;
}

/** What a save changed in a file: the lines of the old text that went and the lines of the new one that came, around the one region both texts differ in. */
function lineDiff(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  return { removed: a.slice(start, endA), added: b.slice(start, endB) };
}

/** The drawing of the kernel's answer, as the page draws it. */
async function draw(sandbox, viewpoint, reference, options = {}) {
  run(sandbox, "currentPerspective = '" + (viewpoint === 'map' ? 'map' : 'elements') + "';");
  const kernel = await sandbox.loadViewpointKernel();
  const { input } = sandbox.buildKernelInput(viewpoint, reference, Object.assign(viewpoint === 'map' ? { opened: ['library', 'archive', 'library.catalog'] } : {}, options.input));
  const result = kernel.compute(input);
  assert.equal(result.error, undefined);
  const comparison = sandbox.comparisonState();
  if (comparison && comparison.layers) sandbox.tellRemovedItems(result, comparison, input.layer);
  const graph = sandbox.buildElkGraph(result, { captions: false });
  const drawing = sandbox.renderDiagramSvg(fakeLayout(graph), result, reference, { map: viewpoint === 'map', show: { labels: false }, layer: input.layer, opened: [], pinned: [] });
  return { input, result, svg: drawing.html, comparison };
}

function nodeOf(svg, id) {
  const at = svg.indexOf('data-id="' + id + '"');
  assert.ok(at > 0, id + ' is drawn');
  const start = svg.lastIndexOf('<g class="dg-node', at);
  const ends = ['<g class="dg-node', '<g class="dg-links"', '<g class="dg-link"', '<g class="dg-fold"', '<text class="dg-label"', '</svg>'].map((m) => svg.indexOf(m, start + 10)).filter((i) => i > 0);
  return svg.slice(start, Math.min(...ends));
}
const pillsOf = (node) => Array.from(node.matchAll(/<g class="dg-badge[^"]*"[^>]*>(?:<rect [^>]*\/>)<text [^>]*>([^<]*)<\/text><\/g>/g), (m) => m[1]);
const varsOf = (node) => Object.fromEntries(Array.from(((node.match(/^<g[^>]* style="([^"]*)"/) || [])[1] || '').matchAll(/(--[a-z-]+):([^;]*)/g), (m) => [m[1], m[2]]));

// ---- 1. The states: one table, glyph, line, pill, tint ----

test('the editor knows moved, split and merged as states, in every place that lists the states, each told apart by glyph and line, not only by colour', async () => {
  const { sandbox } = await open();
  assert.deepEqual(plain(run(sandbox, 'CHANGE_STATES')), ['new', 'changed', 'removed', 'moved', 'split', 'merged']);
  assert.deepEqual(plain(run(sandbox, 'IDENTITY_STATES')), ['moved', 'split', 'merged']);
  assert.deepEqual(plain(run(sandbox, 'RELATIONSHIP_STATES')), ['new', 'changed', 'removed'], 'a relationship is never moved, split or merged');
  const states = run(sandbox, "CHANGE_STATES.concat('contains-changes')");
  const glyphs = plain(run(sandbox, 'CHANGE_GLYPHS'));
  assert.deepEqual([glyphs.moved, glyphs.split, glyphs.merged], ['→', '⋔', '⊕'], 'the glyphs of the command line (ChangeMarks.java)');
  const looks = plain(run(sandbox, 'CHANGE_DEFAULT_LOOK'));
  const words = plain(run(sandbox, 'CHANGE_WORDS'));
  const seen = new Set();
  for (const state of states) {
    assert.ok(glyphs[state] && looks[state] && words[state].word, state + ' has a glyph, a look and a word');
    seen.add(glyphs[state]);
  }
  assert.equal(seen.size, 7, 'the seven glyphs differ');
  const lines = states.map((state) => looks[state]['--st-width'] + '/' + looks[state]['--st-dash']);
  assert.equal(new Set(lines).size, 7, 'and so do the seven lines (a width and a dash pattern), so that colour is never the only way: ' + lines.join(' '));
  for (const state of ['moved', 'split', 'merged']) assert.ok(looks[state]['--st-tint'] && looks[state]['--st-stroke'].includes('--chg-' + state));
});

test('the three colours are defined for the light theme, the system dark theme and the forced dark theme, and read against the page', () => {
  const block = (re) => CSS.match(re)[1];
  const light = block(/:root \{([^}]*)\}/);
  const system = block(/prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/);
  const forced = block(/:root\[data-theme="dark"\] \{([^}]*)\}/);
  const colour = (css, name) => { const m = css.match(new RegExp(name + ': *(#[0-9a-f]{6})')); assert.ok(m, name); return m[1]; };
  const luminance = (hex) => {
    const channel = (i) => { const v = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  };
  const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  for (const [css, name] of [[light, 'light'], [system, 'system dark'], [forced, 'forced dark']]) {
    const bg = css === light ? colour(light, '--bg') : '#1e1e1e';
    for (const state of ['moved', 'split', 'merged']) {
      const value = colour(css, '--chg-' + state);
      assert.ok(contrast(value, bg) >= 3, name + ' ' + state + ' ' + value + ' on ' + bg + ': ' + contrast(value, bg).toFixed(2) + ' is below the 3:1 a line needs');
    }
  }
});

test('the map draws a moved, a split and a merged box with the glyph, the line, the pill and where it came from', async () => {
  const { sandbox } = await open();
  const { svg, result } = await draw(sandbox, 'map', '');
  const moved = nodeOf(svg, 'archive.counter');
  assert.match(moved, /dg-chg-moved/);
  assert.match(moved, /<tspan class="dg-glyph">→<\/tspan> Counter \(from library\.desk\)/, 'the glyph and the title say it, as the title of the command line does');
  assert.deepEqual(pillsOf(moved), ['moved']);
  assert.deepEqual([varsOf(moved)['--st-width'], varsOf(moved)['--st-dash'], varsOf(moved)['--st-stroke'], varsOf(moved)['--st-tint']], ['2px', '14 4', 'var(--chg-moved)', 'var(--chg-moved)']);
  const split = nodeOf(svg, 'library.catalog-a');
  assert.match(split, /dg-chg-split/);
  assert.match(split, /⋔<\/tspan> Catalog of books \(from/, 'a title longer than the box is cut with an ellipsis, as any title is; the tooltip and the panel have it whole');
  assert.equal(sandbox.diagramItemText(result.items.find((i) => i.reference === 'library.catalog-a'), undefined, 'application').title, '⋔ Catalog of books (from library.catalog)');
  assert.deepEqual(pillsOf(split), ['split']);
  assert.equal(varsOf(split)['--st-dash'], '9 3 2 3');
  const merged = nodeOf(svg, 'archive.cabinet');
  assert.match(merged, /dg-chg-merged/);
  assert.match(merged, /⊕<\/tspan> Cabinet \(from archive/);
  assert.equal(sandbox.diagramItemText(result.items.find((i) => i.reference === 'archive.cabinet'), undefined, 'application').title, '⊕ Cabinet (from archive.bin, archive.shelf)');
  assert.deepEqual(pillsOf(merged), ['merged']);
  assert.equal(varsOf(merged)['--st-dash'], '4 2');
  // the answer of compute carries the word; the page does not invent it
  assert.deepEqual(plain(result.items.filter((i) => i.change !== 'none' && i.change !== 'new' && i.change !== 'removed').map((i) => i.reference + ' ' + i.change).sort()),
    ['archive.cabinet merged', 'archive.counter moved', 'library.catalog-a split', 'library.catalog-b split']);
  // the tooltip says it in words
  assert.match(moved, /<title>[^<]*Moved: it replaces library\.desk of the plateau it is compared with and differs from it \(name\)\./);
  assert.match(merged, /<title>[^<]*Merged: it replaces several elements of the plateau it is compared with \(archive\.bin, archive\.shelf\)\./);
});

test('a removed box that is only the place of what was replaced says what replaced it, after its struck name', async () => {
  const { sandbox } = await open();
  const { result } = await draw(sandbox, 'map', '');
  const item = result.items.find((i) => i.reference === 'library.catalog');
  assert.equal(item.change, 'removed');
  assert.deepEqual(plain(item.replacedBy), ['library.catalog-a', 'library.catalog-b']);
  const text = sandbox.diagramItemText(item, undefined, 'application');
  assert.equal(text.title, '− Catalog (replaced by library.catalog-a, library.catalog-b)');
  assert.equal(sandbox.diagramTitleHtml(text.title, text), '<tspan class="dg-glyph">−</tspan> <tspan class="dg-struck">Catalog</tspan> (replaced by library.catalog-a, library.catalog-b)', 'only the name is struck');
  // a long title wrapped by the layout: the line that is the note alone is not struck
  assert.equal(sandbox.diagramTitleHtml('library.catalog-a, library.catalog-b)', text), 'library.catalog-a, library.catalog-b)');
  // a removed box that is really removed (its replacement is not told) is what it was
  const mailer = result.items.find((i) => i.reference === 'library.catalog.index');
  assert.equal(sandbox.diagramItemText(mailer, undefined, 'application').title, '− Index');
  // the removed box is drawn in the lists of the page as it was, with its word
  assert.deepEqual(plain(sandbox.comparisonState().records.get('application|library.catalog').replaced_by), ['library.catalog-a', 'library.catalog-b']);
});

test('the key lists a state of identity only when the drawing has a box in it; every other drawing has the key it had', async () => {
  const { sandbox } = await open();
  const full = await draw(sandbox, 'map', '');
  const counts = plain(sandbox.comparisonCountsOf(full.result));
  assert.deepEqual(counts.moved, { boxes: 1 });
  assert.deepEqual(counts.split, { boxes: 2 });
  assert.deepEqual(counts.merged, { boxes: 1 });
  const legend = text(sandbox.diagramComparisonLegendHtml(full.comparison, counts));
  assert.match(legend, /\+ new thick solid 2 boxes, 0 links ~ changed dotted 0 boxes, 0 links − removed dashed, struck title 4 boxes, 0 links → moved long dashes: replaces one element 1 box ⋔ split dash-dot: one of several that replace one 2 boxes ⊕ merged short dashes: replaces several 1 box ± contains changes thin dashed: something inside changed 2 boxes/);
  // the diagram of one element that has none of them: the key is the key of the four states
  const one = await draw(sandbox, 'overview', 'library.lending');
  const oneLegend = text(sandbox.diagramComparisonLegendHtml(one.comparison, plain(sandbox.comparisonCountsOf(one.result))));
  assert.doesNotMatch(oneLegend, /\bmoved\b|\bsplit\b|\bmerged\b/);
  // no count given (the caller that does not count): the four states, as before
  assert.doesNotMatch(text(sandbox.diagramComparisonLegendHtml(full.comparison, null)), /\bmoved\b|\bsplit\b|\bmerged\b/);
  // and its samples are drawn with the same variables as the boxes
  const html = sandbox.diagramComparisonLegendHtml(full.comparison, counts);
  assert.match(html, /<span class="dg-legend-state" data-state="split"><svg[^>]*><g class="dg-styled dg-chg-split" style="[^"]*--st-dash:9 3 2 3/);
  assert.doesNotMatch(html, /data-state="moved"><svg[^>]*>[\s\S]{0,400}<svg width="26" height="8"/, 'a state of a box has no sample of a link');
});

test('the SVG export defines the colours of the three states and repeats nothing else that a relationship does not have', async () => {
  const { sandbox } = await open();
  const themes = { '--bg': '#fcfcfc', '--panel-bg': '#f1f1f1', '--border': '#dddddd', '--muted': '#667788', '--fg': '#111111', '--accent': '#0a66cc', '--danger': '#cc0000',
    '--chg-new': '#007744', '--chg-changed': '#995500', '--chg-removed': '#666666', '--chg-removed-text': '#555555', '--chg-contains': '#446688',
    '--chg-moved': '#0a5599', '--chg-split': '#993377', '--chg-merged': '#2277aa' };
  sandbox.getComputedStyle = () => ({ getPropertyValue: (name) => ' ' + themes[name] + ' ' });
  const css = sandbox.diagramExportCss();
  assert.ok(css.includes('svg{--chg-moved:#0a5599;--chg-split:#993377;--chg-merged:#2277aa}'));
  assert.ok(css.indexOf('--chg-moved') < css.indexOf('.dg-tint'), 'defined before the rules that read them');
  assert.doesNotMatch(css, /dg-edge\.dg-chg-(moved|split|merged)/, 'a link has no such state');
  // and the boxes carry their variables inline, so that the exported file draws them
  const { svg } = await draw(sandbox, 'map', '');
  assert.match(nodeOf(svg, 'archive.counter'), /--st-stroke:var\(--chg-moved\)/);
});

test('a state written by hand on a box that does not have it gets none of the look; the computed state does (the rule of run 0043 holds for the new words)', async () => {
  const { sandbox } = await open();
  const { svg, result } = await draw(sandbox, 'map', '');
  const fines = result.items.find((i) => i.reference === 'library.fines');
  assert.equal(fines.change, 'none');
  assert.deepEqual(plain(fines.stereotypes), ['moved'], 'the word is there, as the author wrote it');
  const node = nodeOf(svg, 'library.fines');
  assert.doesNotMatch(node, /dg-chg-moved/);
  assert.equal(varsOf(node)['--st-dash'], undefined, 'no dash of the state');
  assert.equal(varsOf(node)['--st-tint'], undefined, 'no tint');
  assert.deepEqual(pillsOf(node), [], 'no pill: the workspace styled nothing of that name');
  assert.doesNotMatch(node, /dg-glyph/, 'no glyph');
  assert.equal(sandbox.diagramItemText(fines, undefined, 'application').state, null);
  // an entry of the workspace's styles with that name is the author's own, and only that
  sandbox.__state().workspace.styles = { 'by-tags': { moved: { 'line-color': '#123456' } } };
  const styled = await draw(sandbox, 'map', '');
  const own = varsOf(nodeOf(styled.svg, 'library.fines'));
  assert.equal(own['--st-stroke'], '#123456');
  assert.equal(own['--st-dash'], undefined);
  // the same word on a box that is moved: the default look under the author's entry, property by property
  const moved = varsOf(nodeOf(styled.svg, 'archive.counter'));
  assert.equal(moved['--st-stroke'], '#123456');
  assert.equal(moved['--st-dash'], '14 4');
});

test('the trees mark a moved, split or merged element with its glyph, and what is above them with the marker', async () => {
  const { sandbox } = await open();
  const state = sandbox.comparisonState();
  run(sandbox, 'treeComparison = comparisonForTrees();');
  const of = (reference) => run(sandbox, 'treeChangeOf(AppState.index.application.get(' + JSON.stringify(reference) + '))');
  assert.equal(of('archive.counter'), 'moved');
  assert.equal(of('library.catalog-a'), 'split');
  assert.equal(of('archive.cabinet'), 'merged');
  assert.equal(of('archive'), 'contains-changes');
  assert.equal(of('library.fines'), null);
  const mark = sandbox.treeChangeMarkHtml('merged');
  assert.match(mark, /^<span class="tree-change" data-state="merged" title="Merged since Base" aria-hidden="true">⊕<\/span>$/);
  assert.match(CSS, /\.tree-change\[data-state="moved"\][^}]*border-style: dashed/);
  assert.match(CSS, /\.tree-change\[data-state="merged"\][^}]*border-style: double/);
  assert.ok(state.above.application.has('archive'));
});

// ---- 2. The Changes panel ----

test('the counts and the rows of the Changes panel: the three states, in the order a reviewer reads them, each row saying where the element came from', async () => {
  const { sandbox } = await open();
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  const counts = text(panel.slice(panel.indexOf('class="changes-counts"') + 'class="changes-counts" role="group" aria-label="Counts">'.length, panel.indexOf('<label class="changes-toggle"')));
  assert.equal(counts, 'Elements + 2 new ~ 0 changed − 3 removed → 1 moved ⋔ 2 split ⊕ 1 merged Relationships + 0 new ~ 0 changed − 0 removed', 'a relationship is none of the three');
  const list = panel.slice(panel.indexOf('<ul class="change-list" aria-label="Elements that differ">'));
  const rows = Array.from(list.slice(0, list.indexOf('</ul>')).matchAll(/<li><button[^>]*>([\s\S]*?)<\/button><\/li>/g), (m) => text(m[1]));
  assert.deepEqual(rows, [
    '+ new Vault archive.vault',
    '+ new Lending library.lending',
    '→ moved Counter archive.counter from library.desk name',
    '⋔ split Catalog of books library.catalog-a from library.catalog; split with library.catalog-b',
    '⋔ split Catalog of films library.catalog-b from library.catalog; split with library.catalog-a',
    '⊕ merged Cabinet archive.cabinet from archive.bin, archive.shelf',
    '− removed Rack archive.rack',
    '− removed Index library.catalog.index',
    '− removed Loans library.loans'
  ]);
  // the replaced element has no row: it is not removed
  assert.ok(!rows.some((row) => /Front desk|Shelf|Bin/.test(row)));
  // the row is a button like the others: it selects the element and carries the word
  assert.deepEqual(plain(attributesOf(list, 'data-change="moved"')), { type: 'button', class: 'change-row', 'data-action': 'select-change', 'data-thing': 'element', 'data-change': 'moved', 'data-layer': 'application', 'data-ref': 'archive.counter' });
});

test('the tab strip counts the rows the panel lists, the new ones included, and a click on a row of a state of identity selects the element', async () => {
  const { sandbox, state } = await open();
  assert.equal(sandbox.comparisonState().changes.length, 9);
  click(sandbox, { 'data-action': 'select-change', 'data-thing': 'element', 'data-change': 'merged', 'data-layer': 'application', 'data-ref': 'archive.cabinet' });
  assert.deepEqual(plain({ kind: state.selection.kind, key: state.selection.key }), { kind: 'element', key: 'archive.cabinet' });
});

test('Changes only keeps the elements that moved, split or merged, with the boxes that place them', async () => {
  const { sandbox } = await open();
  run(sandbox, "currentPerspective = 'map';");
  const kernel = await sandbox.loadViewpointKernel();
  sandbox.__state().changesOnly = true;
  const { input } = sandbox.buildKernelInput('map', '', { opened: ['library', 'archive'] });
  assert.equal(input.only_changes, true);
  const result = kernel.compute(input);
  const kept = Object.fromEntries(result.items.map((i) => [i.reference, i.context === true ? 'context' : i.change]));
  assert.equal(kept['archive.counter'], 'moved');
  assert.equal(kept['library.catalog-a'], 'split');
  assert.equal(kept['archive.cabinet'], 'merged');
  assert.equal(kept['library.fines'], undefined, 'what did not change is left out');
  assert.equal(kept.archive, 'context');
});

// ---- 3. The inspector ----

test('the inspector of a moved element says what it replaces and what else changed, before and after', async () => {
  const { sandbox } = await open();
  const html = sandbox.renderWhatChangedHtml('application', 'archive.counter', false);
  assert.match(html, /^<section class="what-changed" aria-label="What changed" data-state="moved">/);
  assert.equal(text(html), 'What changed → moved Moved or renamed: it replaces an element of “Base”. Replaces Front desk library.desk Also changed: name. Compared with “Base”. Name − Before Front desk + After Counter');
  const split = text(sandbox.renderWhatChangedHtml('application', 'library.catalog-b', false));
  assert.equal(split, 'What changed ⋔ split Split: it is one of several elements that replace an element of “Base”. Replaces Catalog library.catalog');
  const merged = text(sandbox.renderWhatChangedHtml('application', 'archive.cabinet', false));
  assert.equal(merged, 'What changed ⊕ merged Merged: it replaces several elements of “Base”. Replaces Bin archive.bin Shelf archive.shelf');
});

test('a moved element that did not change otherwise tells only the identity', async () => {
  const target = Object.assign({}, TARGET, { 'app.archive.counter.yaml': element('container', 'archive', 'counter', 'Front desk', '  replaces:\n    - library.desk\n') });
  const { sandbox } = await open({ target });
  const html = sandbox.renderWhatChangedHtml('application', 'archive.counter', false);
  assert.equal(text(html), 'What changed → moved Moved or renamed: it replaces an element of “Base”. Replaces Front desk library.desk');
  assert.doesNotMatch(html, /change-diff" data-property="name"|Also changed/);
});

test('an element replaced by others that is drawn only as the place of what it held says what replaced it', async () => {
  const { sandbox } = await open();
  const html = sandbox.renderWhatChangedHtml('application', 'library.catalog', false);
  assert.equal(text(html), 'What changed − removed Whole element is removed: it is only in “Base”. Replaced by Catalog of books library.catalog-a Catalog of films library.catalog-b');
  // a removed element that nothing replaced has no such line
  assert.doesNotMatch(sandbox.renderWhatChangedHtml('application', 'library.loans', false), /Replaced by/);
  // and the same block is in the read-only panel of a removed box
  const panel = sandbox.inspectionPanelHtml({ kind: 'baseline-element', key: 'library.catalog', layer: 'application', mode: 'view' }, 'library');
  assert.match(text(panel), /Replaced by Catalog of books library\.catalog-a Catalog of films library\.catalog-b/);
});

test('an unknown reference is told as such wherever the list is read', async () => {
  const { sandbox } = await open();
  const view = sandbox.renderElementViewHtml('library.catalog-b');
  assert.match(text(view), /Replaces 2 library\.catalog library\.nowhere not in “Base”/, 'the details of the element: only the reference the plateau compared with does not have is flagged');
  assert.equal(sandbox.replacesFlagOf(sandbox.__state().index.application.get('library.catalog-b'), 'library.nowhere'), 'not in “Base”');
  assert.equal(sandbox.replacesFlagOf(sandbox.__state().index.application.get('library.catalog-b'), 'library.fines'), 'still in this plateau: ignored');
  assert.equal(sandbox.replacesFlagOf(sandbox.__state().index.application.get('library.catalog-b'), 'library.catalog'), '');
});

// ---- 4. Candidates ----

test('the Changes panel lists the candidates of the kernel, each with "Write replaces" and "Not related", and applies none', async () => {
  const { sandbox } = await open();
  const state = sandbox.comparisonState();
  assert.deepEqual(plain(state.candidates), [
    { layer: 'application', from: 'archive.rack', to: 'archive.vault', reasons: ['description', 'parent'] },
    { layer: 'application', from: 'library.loans', to: 'library.lending', reasons: ['description', 'parent'] }
  ]);
  const panel = sandbox.renderChangesPanelHtml(state);
  const section = panel.slice(panel.indexOf('<section class="changes-candidates"'), panel.indexOf('</section>', panel.indexOf('<section class="changes-candidates"')));
  assert.match(text(section), /^Candidates 2 Each pair looks like one thing said twice\. Nothing is applied/);
  const items = Array.from(section.matchAll(/<li class="change-candidate"[\s\S]*?<\/li>/g), (m) => m[0]);
  assert.equal(items.length, 2);
  assert.equal(text(items[0]), 'Removed Rack archive.rack New Vault archive.vault close description, the only two of their kind under the same parent Write replaces Not related');
  assert.equal(text(items[1]), 'Removed Loans library.loans New Lending library.lending close description, the only two of their kind under the same parent Write replaces Not related');
  assert.deepEqual(plain(attributesOf(items[1], 'data-action="accept-candidate"')), { type: 'button', 'data-action': 'accept-candidate', 'data-layer': 'application', 'data-from': 'library.loans', 'data-to': 'library.lending' });
  assert.deepEqual(plain(attributesOf(items[1], 'data-action="dismiss-candidate"')), { type: 'button', 'data-action': 'dismiss-candidate', 'data-layer': 'application', 'data-from': 'library.loans', 'data-to': 'library.lending' });
  // listed, not applied: the loans are still removed and the lending still new
  const rows = state.changes.filter((row) => row.thing === 'element');
  assert.equal(rows.find((row) => row.reference === 'library.loans').change, 'removed');
  assert.equal(rows.find((row) => row.reference === 'library.lending').change, 'new');
  assert.equal(sandbox.__state().dirtyReferences.size, 0, 'nothing is modified by looking at them');
});

test('"Write replaces" writes exactly one `replaces` on the new element, keeps every other line, and the comparison then says it moved', async () => {
  const { sandbox, state, mem } = await open();
  const version = run(sandbox, 'modelVersion');
  click(sandbox, { 'data-action': 'accept-candidate', 'data-layer': 'application', 'data-from': 'library.loans', 'data-to': 'library.lending' });
  assert.ok(run(sandbox, 'modelVersion') > version, 'the models changed: the comparison is asked again');
  // the page: the model says it, the comparison reports it as moved, the candidate is gone
  assert.deepEqual(plain(state.index.application.get('library.lending').replaces), ['library.loans']);
  const after = sandbox.comparisonState();
  const row = after.changes.find((r) => r.reference === 'library.lending');
  assert.equal(row.change, 'moved');
  assert.deepEqual(plain(row.replaces), ['library.loans']);
  assert.equal(after.changes.some((r) => r.reference === 'library.loans'), false, 'no longer removed');
  assert.deepEqual(plain(after.candidates.map((c) => c.to)), ['archive.vault']);
  assert.equal(state.dirtyReferences.has('application:library.lending'), true, 'marked as modified, saved with the rest');
  // the file is not written until the user saves: the disk still has the original
  assert.equal(mem.files.get(target('library.lending')).text, TARGET['app.library.lending.yaml']);
  // the save: the file differs from the original by the two lines written, nothing else
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus').state, 'success');
  assert.deepEqual(mem.writes, [target('library.lending')], 'one file is written');
  const saved = mem.files.get(target('library.lending')).text;
  assert.deepEqual(lineDiff(TARGET['app.library.lending.yaml'], saved), { removed: [], added: ['  replaces:', '    - "library.loans"'] });
  assert.ok(saved.startsWith('# the manifest of lending\n') && saved.endsWith('# end of lending\n'), 'the comments, the quotes and the blank line are the author\'s');
  assert.ok(saved.includes('  kind: "archicode.morin.io/container"') && saved.includes('\n\ncontent:\n'));
  // and the file reads back as the editor, and the command line, read it
  const again = createApp({});
  await again.loadWorkspace(mem.handle);
  assert.deepEqual(plain(again.__state().index.application.get('library.lending').replaces), ['library.loans']);
});

test('a list written on one line gets the new reference appended, and only that line changes', async () => {
  const { sandbox, mem } = await open();
  click(sandbox, { 'data-action': 'accept-candidate', 'data-layer': 'application', 'data-from': 'archive.rack', 'data-to': 'archive.vault' });
  assert.deepEqual(plain(sandbox.__state().index.application.get('archive.vault').replaces), ['archive.ghost', 'archive.rack'], 'appended after what the author wrote, no duplicate');
  await sandbox.saveAllChanges();
  const saved = mem.files.get(target('archive.vault')).text;
  assert.deepEqual(lineDiff(TARGET['app.archive.vault.yaml'], saved), { removed: ['  replaces: [archive.ghost]'], added: ['  replaces:', '    - archive.ghost', '    - archive.rack'] });
  assert.ok(saved.startsWith('# the manifest of vault\n') && saved.endsWith('# end of vault\n'));
  assert.equal(sandbox.comparisonState().changes.find((r) => r.reference === 'archive.vault').change, 'moved');
  // writing the same reference again changes nothing (the kernel would not propose it, but the writer does not duplicate)
  assert.deepEqual(plain(run(sandbox, "replacesWith(['a', 'b'], 'a')")), ['a', 'b']);
});

test('other flow lists of a file the edit does not touch stay on their line, and a flow list the edit changes becomes a block', async () => {
  const withQualifiers = element('container', 'library', 'lending', 'Lending', LOANS_DESCRIPTION + '  qualifiers: [Loan, Member]  # who borrows\n');
  const { sandbox, mem } = await open({ target: Object.assign({}, TARGET, { 'app.library.lending.yaml': withQualifiers }) });
  click(sandbox, { 'data-action': 'accept-candidate', 'data-layer': 'application', 'data-from': 'library.loans', 'data-to': 'library.lending' });
  await sandbox.saveAllChanges();
  assert.deepEqual(lineDiff(withQualifiers, mem.files.get(target('library.lending')).text), { removed: [], added: ['  replaces:', '    - "library.loans"'] }, 'the list on one line, its comment and its quotes are as they were');
});

test('"Not related" sets the pair aside for this page: the list loses it, nothing is written, and "Show again" brings it back', async () => {
  const { sandbox, state, mem } = await open();
  click(sandbox, { 'data-action': 'dismiss-candidate', 'data-layer': 'application', 'data-from': 'archive.rack', 'data-to': 'archive.vault' });
  let panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  assert.match(text(panel), /Candidates 1 /);
  assert.doesNotMatch(panel, /data-from="archive\.rack"/);
  assert.match(panel, /data-from="library\.loans"/, 'the other one stays');
  assert.match(text(panel), /1 set aside\. Show again/);
  assert.equal(state.dirtyReferences.size, 0);
  assert.deepEqual(mem.writes, []);
  // in memory only: the kernel is told nothing and a reload of the comparison keeps nothing in the model
  assert.deepEqual(plain(sandbox.comparisonState().candidates.map((c) => c.to)), ['archive.vault', 'library.lending'], 'the kernel still proposes both');
  assert.deepEqual(plain(state.index.application.get('archive.vault').replaces), ['archive.ghost']);
  click(sandbox, { 'data-action': 'restore-candidates' });
  panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  assert.match(text(panel), /Candidates 2 /);
  assert.doesNotMatch(text(panel), /set aside/);
  // setting both aside leaves the section with the way back and no pair
  click(sandbox, { 'data-action': 'dismiss-candidate', 'data-layer': 'application', 'data-from': 'archive.rack', 'data-to': 'archive.vault' });
  click(sandbox, { 'data-action': 'dismiss-candidate', 'data-layer': 'application', 'data-from': 'library.loans', 'data-to': 'library.lending' });
  panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  assert.match(text(panel), /Candidates 0 2 set aside\. Show again/);
  assert.doesNotMatch(panel, /change-candidate"/);
});

test('a candidate is refused, with the reason in the panel, when its new element is in the baseline, which is only read', async () => {
  const { sandbox, state, mem } = await open();
  // the pair is made up here: the page would never list it, the writer must still refuse it
  const result = sandbox.acceptCandidate({ layer: 'application', from: 'library.fines', to: 'library.loans' });
  assert.equal(result.ok, false);
  assert.equal(result.message, '“library.loans” belongs to “Base”, which is only read to compare and is never written. replaces goes on an element of “Target”, the plateau drawn.');
  assert.match(sandbox.renderChangesPanelHtml(sandbox.comparisonState()), /<p class="changes-message" role="alert">“library\.loans” belongs to “Base”/);
  assert.equal(state.dirtyReferences.size, 0);
  assert.deepEqual(mem.writes, []);
  // the baseline's files are not the editor's: there is no file of the plateau compared with among the ones it holds
  assert.ok(state.manifestFiles.every((file) => file.relPath.startsWith('plateaus/20_target/')));
  // another refusal replaces the message, a click on a row of the list clears it
  assert.equal(sandbox.acceptCandidate({ layer: 'application', from: 'library.fines', to: 'library.nowhere' }).ok, false);
  assert.match(sandbox.renderChangesPanelHtml(sandbox.comparisonState()), /“library\.nowhere” is not an element of “Target” any more; nothing was written\./);
  click(sandbox, { 'data-action': 'select-change', 'data-thing': 'element', 'data-change': 'new', 'data-layer': 'application', 'data-ref': 'library.lending' });
  assert.doesNotMatch(sandbox.renderChangesPanelHtml(sandbox.comparisonState()), /changes-message/);
});

test('a candidate is refused when the plateau drawn comes before the one it is compared with, so that replaces is never written on the older plateau', async () => {
  const { sandbox, state, mem } = await open({ compare: false });
  await sandbox.switchPlateau('base');
  await sandbox.setCompareTo('target');
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.problems, undefined);
  assert.ok(comparison.candidates.length > 0, 'the comparison turned the other way proposes pairs too: ' + JSON.stringify(comparison.candidates));
  const result = sandbox.acceptCandidate(comparison.candidates[0]);
  assert.equal(result.ok, false);
  assert.match(result.message, /^“Base” comes before “Target” in the plateaus of this workspace\. replaces is written on the element of the more recent plateau: draw “Target” and compare it with “Base”\.$/);
  assert.equal(state.dirtyReferences.size, 0);
  assert.deepEqual(mem.writes, []);
});

test('a candidate is refused when the replaced element is still in the plateau drawn, when it is unknown, and when the list is not a list', async () => {
  const { sandbox, state } = await open();
  assert.match(sandbox.acceptCandidate({ layer: 'application', from: 'library.fines', to: 'library.lending' }).message, /^“library\.fines” is still an element of “Target”: a replaces that names it would be ignored\.$/);
  assert.match(sandbox.acceptCandidate({ layer: 'application', from: 'library.unknown', to: 'library.lending' }).message, /^“library\.unknown” is not an element of “Base”; nothing was written\.$/);
  assert.equal(state.dirtyReferences.size, 0);
  const odd = Object.assign({}, TARGET, { 'app.library.lending.yaml': element('container', 'library', 'lending', 'Lending', LOANS_DESCRIPTION + '  replaces: library.loans\n') });
  const scalar = await open({ target: odd });
  assert.equal(scalar.sandbox.acceptCandidate({ layer: 'application', from: 'library.loans', to: 'library.lending' }).message, 'The replaces of “library.lending” is not a list; fix it by hand, nothing was written.');
  assert.equal(scalar.state.dirtyReferences.size, 0);
  // and without any comparison there is nothing to accept
  const none = await open({ compare: false });
  assert.equal(none.sandbox.acceptCandidate({ layer: 'application', from: 'library.loans', to: 'library.lending' }).message, 'Nothing is compared: choose a plateau in Compare to first.');
});

// ---- 5. By hand ----

/** The fields of the edit form, as the page reads them, for the element `reference`. */
function formFields(sandbox, reference, adding) {
  const record = sandbox.__state().index.application.get(reference);
  const errors = {};
  const fields = {
    'edit-id-input': { value: record.id },
    'edit-name-input': { value: record.name },
    'edit-description-input': { value: record.description || '' },
    'add-replaces-input': { value: adding === undefined ? '' : adding }
  };
  const original = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => {
    if (fields[id]) return fields[id];
    if (/error$/.test(id)) return { set textContent(v) { errors[id] = v; }, get textContent() { return errors[id]; } };
    return original(id);
  };
  return { errors, fields };
}

test('the edit form of an element has a Replaces section when the workspace has plateaus, with the list, a flag on what the other plateau does not have, and a field to add one', async () => {
  const { sandbox } = await open();
  const form = sandbox.renderElementEditionFormHtml('library.catalog-b');
  const section = form.slice(form.indexOf('<div class="edition-section" data-section="replaces">'));
  assert.match(text(section), /^Replaces The elements of the plateau this one is compared with that this element is the new place of \(moved, renamed, split or merged\)\. Written by you, never guessed\. library\.catalog × library\.nowhere not in “Base” × Add$/);
  assert.match(section, /<input type="text" id="add-replaces-input"[^>]*list="archicode-baseline-references"/);
  assert.match(section, /data-action="remove-replaces" data-ref="library\.catalog-b" data-index="1"/);
  assert.match(sandbox.renderReferenceDatalistsHtml(), /<datalist id="archicode-baseline-references">(<option value="[^"]*">)*<option value="library\.loans">/, 'the references of the plateau compared with are offered');
  // an element with nothing to replace still has the section: that is how an author begins
  assert.match(sandbox.renderElementEditionFormHtml('library.fines'), /data-section="replaces"/);
});

test('adding a reference by hand writes one line more, validates, flags an unknown reference and keeps the rest of the file', async () => {
  const { sandbox, state, mem } = await open();
  const { errors } = formFields(sandbox, 'library.lending', 'library.loans');
  click(sandbox, { 'data-action': 'add-replaces', 'data-ref': 'library.lending' });
  assert.deepEqual(plain(state.index.application.get('library.lending').replaces), ['library.loans']);
  assert.equal(sandbox.comparisonState().changes.find((r) => r.reference === 'library.lending').change, 'moved', 'the same writer, the same result as accepting the candidate');
  await sandbox.saveAllChanges();
  assert.deepEqual(lineDiff(TARGET['app.library.lending.yaml'], mem.files.get(target('library.lending')).text), { removed: [], added: ['  replaces:', '    - "library.loans"'] });
  // an unknown reference is allowed, and flagged in the list and by the kernel's warning
  formFields(sandbox, 'library.fines', 'library.somewhere');
  click(sandbox, { 'data-action': 'add-replaces', 'data-ref': 'library.fines' });
  assert.deepEqual(plain(state.index.application.get('library.fines').replaces), ['library.somewhere']);
  assert.match(text(sandbox.renderElementEditionFormHtml('library.fines')), /library\.somewhere not in “Base” ×/);
  assert.ok(sandbox.comparisonState().warnings.some((w) => /library\.fines.*library\.somewhere is not an element of the base plateau, ignored/.test(w)));
  // empty, itself, twice, with a space
  for (const [value, message] of [['', 'Value is required.'], ['library.fines', 'An element cannot replace itself.'], ['library.somewhere', '“library.somewhere” is already listed.'], ['a b', 'A reference has no spaces.']]) {
    const fields = formFields(sandbox, 'library.fines', value);
    click(sandbox, { 'data-action': 'add-replaces', 'data-ref': 'library.fines' });
    assert.equal(fields.errors['add-replaces-error'], message);
  }
  assert.deepEqual(plain(state.index.application.get('library.fines').replaces), ['library.somewhere'], 'a refused value writes nothing');
  assert.equal(errors['add-replaces-error'] === undefined || errors['add-replaces-error'] === '', true);
});

test('removing a reference by hand takes its line out of the file; the last one takes the key with it', async () => {
  const { sandbox, state, mem } = await open();
  sandbox.confirm = () => true;
  formFields(sandbox, 'archive.cabinet');
  click(sandbox, { 'data-action': 'remove-replaces', 'data-ref': 'archive.cabinet', 'data-index': '0' });
  assert.deepEqual(plain(state.index.application.get('archive.cabinet').replaces), ['archive.bin'], 'the shelf went, the bin stayed');
  assert.equal(sandbox.comparisonState().changes.find((r) => r.reference === 'archive.cabinet').change, 'moved', 'one replaced element left: moved, not merged');
  await sandbox.saveAllChanges();
  assert.deepEqual(lineDiff(TARGET['app.archive.cabinet.yaml'], mem.files.get(target('archive.cabinet')).text), { removed: ['    - archive.shelf'], added: [] });
  formFields(sandbox, 'archive.cabinet');
  click(sandbox, { 'data-action': 'remove-replaces', 'data-ref': 'archive.cabinet', 'data-index': '0' });
  await sandbox.saveAllChanges();
  assert.equal(state.index.application.get('archive.cabinet').replaces.length, 0);
  assert.deepEqual(lineDiff(TARGET['app.archive.cabinet.yaml'], mem.files.get(target('archive.cabinet')).text), { removed: ['  replaces:', '    - archive.shelf', '    - archive.bin'], added: [] });
  assert.equal(sandbox.comparisonState().changes.find((r) => r.reference === 'archive.cabinet').change, 'new');
  // declining the confirmation changes nothing
  sandbox.confirm = () => false;
  formFields(sandbox, 'library.catalog-a');
  click(sandbox, { 'data-action': 'remove-replaces', 'data-ref': 'library.catalog-a', 'data-index': '0' });
  assert.deepEqual(plain(state.index.application.get('library.catalog-a').replaces), ['library.catalog']);
});

test('a list that is not a list is not overwritten by hand either', async () => {
  const odd = Object.assign({}, TARGET, { 'app.library.lending.yaml': element('container', 'library', 'lending', 'Lending', LOANS_DESCRIPTION + '  replaces: library.loans\n') });
  const { sandbox, state, mem } = await open({ target: odd });
  formFields(sandbox, 'library.lending', 'library.fines2');
  click(sandbox, { 'data-action': 'add-replaces', 'data-ref': 'library.lending' });
  assert.match(run(sandbox, 'saveStatus').message, /is not a list; fix it in the file, nothing was written\./);
  await sandbox.saveAllChanges();
  assert.deepEqual(mem.writes, [], 'nothing to save');
  assert.equal(state.index.application.get('library.lending').replaces.length, 0);
});

// ---- 6. The warnings ----

test('the warnings of the kernel are a short list in the Changes panel, as the kernel says them, and nowhere else', async () => {
  const { sandbox } = await open();
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  const section = panel.slice(panel.indexOf('<section class="changes-warnings-section"'), panel.indexOf('</section>', panel.indexOf('<section class="changes-warnings-section"')));
  assert.equal(text(section), 'Warnings 2 replaces of archive.vault (application layer): archive.ghost is not an element of the base plateau, ignored replaces of library.catalog-b (application layer): library.nowhere is not an element of the base plateau, ignored');
  assert.deepEqual(plain(sandbox.comparisonState().warnings), [
    'replaces of archive.vault (application layer): archive.ghost is not an element of the base plateau, ignored',
    'replaces of library.catalog-b (application layer): library.nowhere is not an element of the base plateau, ignored'
  ]);
  // a reference that is still in the plateau drawn is another warning, and goes away with the reference
  const still = Object.assign({}, TARGET, { 'app.library.catalog-b.yaml': element('container', 'library', 'catalog-b', 'Catalog of films', '  replaces: [library.catalog, library.fines]\n') });
  const second = await open({ target: still });
  assert.ok(second.sandbox.comparisonState().warnings.some((w) => /library\.fines is still an element of the target plateau, ignored/.test(w) || /library\.fines/.test(w)), JSON.stringify(second.sandbox.comparisonState().warnings));
});

// ---- 7. Without any of it ----

test('a comparison with no replaces and no candidate is the Changes panel it was: no section, no new count, no new key', async () => {
  const base = { 'app.shop.yaml': element('system', null, 'shop', 'Shop'), 'app.shop.web.yaml': element('container', 'shop', 'web', 'Web', '  description: "Serves the pages."\n') };
  const next = { 'app.shop.yaml': element('system', null, 'shop', 'Shop'), 'app.shop.web.yaml': element('container', 'shop', 'web', 'Web', '  description: "Serves the pages and the images."\n'), 'app.shop.db.yaml': element('component', 'shop.web', 'db', 'Database') };
  const { sandbox } = await open({ base, target: next });
  const state = sandbox.comparisonState();
  assert.deepEqual(plain(state.candidates), []);
  assert.deepEqual(plain(state.warnings), []);
  const panel = sandbox.renderChangesPanelHtml(state);
  assert.doesNotMatch(panel, /changes-candidates|changes-warnings|Candidates|Warnings|change-from|accept-candidate/);
  assert.equal(text(panel.slice(panel.indexOf('Elements'), panel.indexOf('Relationships'))), 'Elements + 1 new ~ 1 changed − 0 removed');
  assert.deepEqual(plain(state.counts.elements), { new: 1, changed: 1, removed: 0, wording_only: 1 });
  assert.equal(JSON.stringify(sandbox.comparisonInput()).includes('replaces'), false);
  // the edit form of an element has no Replaces section when the workspace has a single plateau
  const single = createApp({});
  const mem = memFolder(Object.assign({ 'workspace.yaml': 'settings:\n  name: One\n' }, { 'manifests/app.shop.yaml': element('system', null, 'shop', 'Shop') }));
  const st = single.__state();
  st.folder = { handle: mem.handle, name: 'ws' };
  st.permissionState = 'granted';
  await single.loadWorkspace(mem.handle);
  assert.doesNotMatch(single.renderElementEditionFormHtml('shop'), /data-section="replaces"|add-replaces/);
  assert.doesNotMatch(single.renderReferenceDatalistsHtml(), /baseline-references/);
  assert.doesNotMatch(single.renderElementViewHtml('shop'), /Replaces/);
});

test('with Compare to Nothing none of it is on the page', async () => {
  const { sandbox } = await open({ compare: false });
  run(sandbox, "currentPerspective = 'map';");
  assert.doesNotMatch(sandbox.renderMapPerspectiveHtml().right || '', /changes-panel|Candidates|accept-candidate/);
  assert.equal(sandbox.comparisonState(), null);
  assert.equal(sandbox.renderWhatChangedHtml('application', 'archive.counter', false), '');
  // the form still has its section (the workspace has plateaus), the datalist does not
  assert.doesNotMatch(sandbox.renderReferenceDatalistsHtml(), /baseline-references/);
});

test('the manual no longer says that the editor has three states', () => {
  const manual = fs.readFileSync(path.resolve(__dirname, '../../../doc/README.adoc'), 'utf8');
  assert.doesNotMatch(manual, /editor does not draw these three states yet/i);
  assert.doesNotMatch(manual, /editor (has|draws|knows) (only )?three states/i);
  assert.match(manual, /Write replaces/);
  assert.match(manual, /Not related/);
});
