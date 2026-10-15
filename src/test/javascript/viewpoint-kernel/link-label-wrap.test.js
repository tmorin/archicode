'use strict';
// The caption of a link in the diagram of the standalone editor (run 0033): broken at the spaces into lines of a bounded width
// (soft wrap, always on), one <tspan> per line under the one <text> that is the click target, the layout told the size of
// the whole, the qualifiers kept in one piece as far as possible, the tooltip and the accessible name whole.
// The reference case of the wave is a label of 108 characters and the qualifier `https`; the text here is synthetic.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

/** A layout shaped like ELK's answer, without ELK: the labels keep the size the graph asked for. */
function fakeLayout(graph) {
  const place = (node, x) => Object.assign({}, node, {
    x, y: 0, width: node.width || 400, height: node.height || 200,
    children: (node.children || []).map((child, i) => place(child, 10 + i * 20))
  });
  return Object.assign(place(graph, 0), {
    width: 900, height: 600,
    edges: graph.edges.map((edge) => Object.assign({}, edge, {
      sections: [{ startPoint: { x: 1, y: 1 }, bendPoints: [{ x: 5, y: 1 }], endPoint: { x: 9, y: 9 } }],
      labels: (edge.labels || []).map((label) => Object.assign({ x: 30, y: 7 }, label))
    }))
  });
}

/** 108 characters of invented words: the length of the reference label, none of its text. */
const LABEL_108 = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec tau';
assert.equal(LABEL_108.length, 108);

/** The first drawn link of the overview of `shop.web.api`, given a label and qualifiers; the graph, the drawing, the link. */
async function drawn(label, qualifiers, options = {}, show = {}) {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input);
  const index = result.links.findIndex((link) => !link.secondary);
  const link = result.links[index];
  link.label = label;
  link.qualifiers = qualifiers;
  const graph = sandbox.buildElkGraph(result, options);
  const layout = fakeLayout(graph);
  const svg = sandbox.renderDiagramSvg(layout, result, 'shop.web.api', { show }).html;
  const edge = graph.edges[graph.edges.findIndex((e) => e.id === 'e' + index)];
  const text = (/<text class="dg-label"[^>]*>[\s\S]*?<\/text>/.exec(svg) || [''])[0];
  const tspans = Array.from(text.matchAll(/<tspan x="([^"]*)" y="([^"]*)">([^<]*)<\/tspan>/g), (m) => ({ x: Number(m[1]), y: Number(m[2]), text: m[3] }));
  return { sandbox, link, graph, edge, label: edge && edge.labels && plain(edge.labels[0]), svg, text, tspans, index };
}

const measure = (sandbox, line) => sandbox.diagramMeasureText(line, 11);

test('a short caption stays what it was: one <text> line, 15 px high, no <tspan>', async () => {
  const d = await drawn('reads', ['https']);
  assert.equal(d.label.height, 15);
  assert.equal(d.label.text, 'reads [https]');
  assert.equal(d.tspans.length, 0);
  assert.match(d.text, /^<text class="dg-label" data-from="[^"]+" data-to="[^"]+"[^>]* data-action="select-link" text-anchor="middle" x="[\d.]+" y="19">reads \[https\]<\/text>$/,
    'the first (and only) baseline is where it always was: label.y + 12');
  assert.equal(d.label.width, Math.ceil(measure(d.sandbox, 'reads [https]')) + 10);
});

test('the reference case: 108 characters and a qualifier give lines no wider than the maximum, the qualifier ends the last one', async () => {
  const d = await drawn(LABEL_108, ['https']);
  const max = run(d.sandbox, 'DIAGRAM_LABEL_MAX_WIDTH');
  const lines = plain(d.sandbox.diagramLabelLayout(d.link, false).lines);
  assert.ok(lines.length >= 3, 'a label of that length takes several lines: ' + lines.length);
  assert.ok(lines.length <= run(d.sandbox, 'DIAGRAM_LABEL_LINES'), 'within the cap');
  for (const line of lines) assert.ok(measure(d.sandbox, line) <= max, '"' + line + '" fits');
  assert.equal(lines.join(' '), LABEL_108 + ' [https]', 'nothing is lost, nothing is cut: the words and the qualifier, in order');
  assert.ok(lines[lines.length - 1].endsWith('[https]'), 'the qualifier is on the last line');
  assert.equal(d.tspans.length, lines.length);
  assert.deepEqual(d.tspans.map((t) => t.text), lines);
  // what the layout is told: the width of the widest line (and room around it), the height of all the lines
  assert.equal(d.label.height, lines.length * 13 + 2);
  assert.equal(d.label.width, Math.ceil(Math.max(...lines.map((line) => measure(d.sandbox, line)))) + 10);
  assert.ok(d.label.width <= max + 10);
  assert.equal(d.label.text, LABEL_108 + ' [https]', 'the caption is still the whole of it');
});

test('the lines are centred on the link and drawn under one click target', async () => {
  const d = await drawn(LABEL_108, ['https']);
  const cx = 30 + d.label.width / 2; // fakeLayout puts the label at x=30, y=7
  assert.match(d.text, /^<text class="dg-label" data-from="[^"]+" data-to="[^"]+"[^>]* data-action="select-link" text-anchor="middle" x="[\d.]+" y="[\d.]+">/);
  assert.equal(Number(/ x="([\d.]+)" y=/.exec(d.text)[1]), cx);
  d.tspans.forEach((t, i) => {
    assert.equal(t.x, cx, 'every line is centred on the same x');
    assert.equal(t.y, 7 + 12 + i * 13, 'first baseline where the single line sat, then one line height each');
  });
  assert.equal((d.svg.match(/<text class="dg-label"/g) || []).length, d.graph.edges.filter((edge) => edge.labels).length, 'still one label per link');
  assert.equal(d.text.includes('<text', 1), false, 'one <text> only');
  assert.ok(d.tspans[d.tspans.length - 1].y + 3 <= 7 + d.label.height, 'the last baseline is inside the room the layout reserved');
});

test('the tooltip and the accessible name stay whole, and the data attributes of the link are those of the label', async () => {
  const d = await drawn(LABEL_108, ['https']);
  assert.ok(d.text.includes('<title>') && d.text.includes(LABEL_108 + ' [https]'), 'the label carries the whole tooltip of its link');
  const group = new RegExp('<g class="dg-link"([^>]*)aria-label="([^"]*)"><title>([^<]*)</title>').exec(d.svg);
  assert.ok(group[2].endsWith(': ' + LABEL_108 + ' [https]'), 'aria-label of the link: whole');
  assert.ok(group[3].includes(LABEL_108 + ' [https]'), 'title of the link: whole');
  const ends = (tag) => ['data-from', 'data-to', 'data-nth', 'data-action'].map((name) => (new RegExp(' ' + name + '="([^"]*)"').exec(tag) || [])[1]);
  assert.deepEqual(ends(d.text), ends(group[1] + '>'), 'the label selects the same link as the link does');
  assert.equal(ends(d.text)[3], 'select-link');
});

test('a caption that is too long is cut after four lines with an ellipsis, the qualifier is not what goes; Wrap shows all of it', async () => {
  const words = Array.from({ length: 90 }, (_, i) => 'w' + String(i).padStart(2, '0') + 'xx').join(' ');
  const cut = await drawn(words, ['https']);
  const lines = plain(cut.sandbox.diagramLabelLayout(cut.link, false).lines);
  assert.equal(lines.length, 4, 'no more than four lines');
  assert.ok(lines[lines.length - 1].endsWith('[https]'), 'the qualifier is still the end of the last line');
  assert.ok(lines.slice(0, -1).some((line) => line.endsWith('…')) || lines[lines.length - 1].includes('…'), 'what does not fit is replaced by an ellipsis');
  assert.ok(lines.every((line) => measure(cut.sandbox, line) <= 220));
  assert.ok(cut.text.includes(words + ' [https]'), 'and the tooltip has it all');
  assert.equal(cut.label.height, 4 * 13 + 2);

  const wrapped = await drawn(words, ['https'], { wrap: true }, { wrap: true });
  assert.ok(wrapped.tspans.length > 4, 'with Wrap nothing is cut');
  assert.equal(wrapped.tspans.map((t) => t.text).join(' '), words + ' [https]');
  assert.doesNotMatch(wrapped.text, /…/);
  assert.equal(wrapped.label.height, wrapped.tspans.length * 13 + 2, 'and the layout makes room for all of it');
});

test('a word wider than a line is cut with an ellipsis, as a name is, and is not spread over several lines', async () => {
  const d = await drawn('x'.repeat(300), ['https']);
  const lines = plain(d.sandbox.diagramLabelLayout(d.link, false).lines);
  assert.equal(lines.length, 2, 'the cut word, then the qualifier');
  assert.ok(lines[0].endsWith('…') && /^x+…$/.test(lines[0]));
  assert.ok(measure(d.sandbox, lines[0]) <= 220);
  assert.equal(lines[1], '[https]');
  const inside = await drawn('see ' + 'y'.repeat(300) + ' now', []);
  const parts = plain(inside.sandbox.diagramLabelLayout(inside.link, false).lines);
  assert.ok(parts.every((line) => measure(inside.sandbox, line) <= 220));
  assert.equal(parts.join(' ').match(/…/g).length, 1, 'only the long word is cut');
  assert.ok(parts.join(' ').startsWith('see ') && parts.join(' ').endsWith(' now'));
});

test('with and without qualifiers, a qualifier alone, and the qualifiers that are many', async () => {
  const none = await drawn(LABEL_108, []);
  assert.equal(none.tspans.map((t) => t.text).join(' '), LABEL_108, 'no qualifier, no brackets');
  const only = await drawn('', ['https', 'tcp']);
  assert.equal(only.label.text, '[https, tcp]');
  assert.equal(only.label.height, 15, 'a qualifier alone is one short line');
  assert.equal(only.tspans.length, 0);
  const blank = await drawn('   ', []);
  assert.equal(blank.label, undefined, 'a blank label and no qualifier: nothing to draw, as before');
  // a label that just fits leaves the qualifier no room on the line: it takes its own line rather than being cut
  const exact = await drawn('word '.repeat(7).trim(), ['https']);
  const lines = plain(exact.sandbox.diagramLabelLayout(exact.link, false).lines);
  assert.ok(lines[lines.length - 1].endsWith('[https]'));
  const many = await drawn(LABEL_108, Array.from({ length: 30 }, (_, i) => 'qualifier' + i));
  const manyLines = plain(many.sandbox.diagramLabelLayout(many.link, false).lines);
  assert.ok(manyLines.length <= 4, 'the cap holds with a long list of qualifiers: ' + manyLines.length);
  assert.ok(manyLines.some((line) => line.startsWith('[qualifier0')), 'the qualifiers start a line of their own');
  assert.ok(manyLines.every((line) => measure(many.sandbox, line) <= 220));
});

test('what is written in a label cannot reach the markup', async () => {
  const d = await drawn('reads <b onmouseover="x">" & ' + LABEL_108, ['a&b']);
  assert.doesNotMatch(d.svg, /<b onmouseover/);
  assert.match(d.text, /&lt;b onmouseover=&quot;x&quot;&gt;/);
  assert.match(d.text, /a&amp;b\]/);
});

test('the captions are drawn where Labels is lit, and only there: without Labels the edges carry none', async () => {
  const { sandbox, kernel } = await openFixture();
  const result = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input);
  result.links.forEach((link) => { link.label = LABEL_108; });
  const without = sandbox.buildElkGraph(result, { captions: false });
  assert.ok(without.edges.length > 0 && without.edges.every((edge) => !edge.labels));
  const svg = sandbox.renderDiagramSvg(fakeLayout(without), result, 'shop.web.api', {}).html;
  assert.doesNotMatch(svg, /dg-label/);
  assert.ok(sandbox.buildElkGraph(result).edges.some((edge) => edge.labels && edge.labels[0].height > 15), 'by default they are laid out wrapped');
});

test('the layout and the drawing agree on the lines, whatever the options', async () => {
  for (const wrap of [false, true]) {
    const d = await drawn(LABEL_108, ['https'], { wrap }, { wrap });
    assert.equal(d.tspans.length, (d.label.height - 2) / 13, 'wrap=' + wrap);
  }
});

test('the maximum width is a constant between 200 and 240 px, and the line height is that of the 11 px text of the page and the export', async () => {
  const { sandbox } = await openFixture();
  const max = run(sandbox, 'DIAGRAM_LABEL_MAX_WIDTH');
  assert.ok(max >= 200 && max <= 240, String(max));
  assert.equal(run(sandbox, 'DIAGRAM_LABEL_LINE_HEIGHT'), 13);
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  const page = /\.dg-label \{([^}]*)\}/.exec(html)[1];
  assert.match(page, /font-size: 11px/);
  sandbox.getComputedStyle = () => ({ getPropertyValue: () => '#123456' });
  const exported = /\.dg-label\{([^}]*)\}/.exec(sandbox.diagramExportCss())[1];
  assert.match(exported, /font:11px sans-serif/, 'the export draws the label in the same 11 px');
  assert.doesNotMatch(page + exported, /tspan|dy=/, 'nothing in the CSS depends on the lines being one <text>');
});

/** True when the text holds a surrogate half without its other half: not valid XML, so not valid in the SVG. */
const hasLoneSurrogate = (text) => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(text);

test('a text is cut between code points, never between the two halves of a surrogate pair', async () => {
  const { sandbox } = await openFixture();
  assert.equal(hasLoneSurrogate('\ud83d'), true, 'the probe itself works');
  const emoji = '\u{1F600}'.repeat(100);
  const layout = sandbox.diagramLabelLayout({ label: emoji, qualifiers: [] }, false);
  assert.ok(layout.lines.length > 0 && layout.lines.every((line) => !hasLoneSurrogate(line)), JSON.stringify(layout.lines));
  assert.ok(layout.lines.every((line) => measure(sandbox, line) <= 220));
  const quals = sandbox.diagramLabelLayout({ label: 'reads', qualifiers: [emoji] }, false);
  assert.ok(quals.lines.every((line) => !hasLoneSurrogate(line)), JSON.stringify(quals.lines));
  const wrapped = plain(sandbox.diagramWrapText(emoji, 220, 0, (line) => measure(sandbox, line)));
  assert.ok(wrapped.length > 1 && wrapped.every((line) => !hasLoneSurrogate(line)));
  assert.equal(wrapped.join(''), emoji, 'cut in several lines, nothing lost');
  const ellipsis = plain(sandbox.diagramWrapText(emoji, 220, 1, (line) => measure(sandbox, line)));
  assert.ok(ellipsis.length === 1 && ellipsis[0].endsWith('\u2026') && !hasLoneSurrogate(ellipsis[0]));
  assert.equal(hasLoneSurrogate(sandbox.diagramTruncate(emoji, 15)), false, 'the truncation of a name too');
  assert.equal(sandbox.diagramTruncate('\u{1F600}'.repeat(3), 5), '\u{1F600}'.repeat(3));
});

test('a qualifier wider than a line is cut but keeps its closing bracket', async () => {
  const d = await drawn('reads', ['q'.repeat(300)]);
  const lines = plain(d.sandbox.diagramLabelLayout(d.link, false).lines);
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^\[q+\u2026\]$/, lines[1]);
  assert.ok(lines.every((line) => measure(d.sandbox, line) <= 220));
});
