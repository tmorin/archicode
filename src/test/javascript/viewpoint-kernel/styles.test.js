'use strict';
// What the editor does with the `styles` of the workspace (run 0017): the colour of a stereotype read from the YAML, the text
// colour computed from it (not themed), the look of a list of stereotypes, the boxes and their badges in the SVG, the layout
// that makes room for them, the rows of both trees, the legend, the CSS of the export and of the page, and the guard against
// a value of `.archicode.yaml` that reaches the markup. The look itself is checked in a browser; here, markup, numbers and CSS text.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));

const run = (sandbox, code) => vm.runInContext(code, sandbox);
/** Values from the sandbox live in another realm: copied, they can be compared with deepStrictEqual. */
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

/** A layout shaped like ELK's answer, without ELK: every box as wide and high as the graph asked, under its parent. */
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

/** The styles of the workspace the user really writes: `external` is plain, `new` and `changed` have a fill and a line. */
const userStyles = () => ({
  'by-tags': {
    external: { 'background-color': 'lightgray' },
    new: { 'background-color': '#DAF2E6', 'line-color': '#2A6A4B' },
    changed: { 'background-color': '#FAECDD', 'line-color': '#A2501C' }
  }
});

/** The kernel's answer for a viewpoint, the graph made from it, and the SVG drawn on a layout without ELK. */
function draw(sandbox, kernel, viewpoint, reference, options = {}) {
  run(sandbox, "currentPerspective = 'elements';");
  const result = kernel.compute(sandbox.buildKernelInput(viewpoint, reference, options.input).input);
  assert.ok(!result.error, result.error);
  const graph = sandbox.buildElkGraph(result, options.graph);
  const svg = sandbox.renderDiagramSvg(fakeLayout(graph), result, reference, {}).html;
  return { result, graph, svg };
}

/** The `g` of a box in a drawing, from its opening tag to the next box, link or label. */
function nodeOf(svg, id) {
  const at = svg.indexOf('data-id="' + id + '"');
  assert.ok(at > 0, id + ' is drawn');
  const start = svg.lastIndexOf('<g class="dg-node', at);
  const ends = ['<g class="dg-node', '<g class="dg-link"', '<g class="dg-fold"', '<text class="dg-label"', '</svg>']
    .map((m) => svg.indexOf(m, start + 10))
    .filter((i) => i > 0);
  return svg.slice(start, Math.min(...ends));
}

const openingTag = (node) => node.slice(0, node.indexOf('>') + 1);
const attributeOf = (tag, name) => {
  const m = new RegExp(' ' + name + '="([^"]*)"').exec(tag);
  return m ? m[1] : null;
};
/** The pills of a box: [{ text, style }] in the order they are drawn. */
const badgesOf = (node) =>
  Array.from(
    node.matchAll(
      /<g class="dg-badge([^"]*)"(?: style="([^"]*)")? aria-hidden="true">(<rect [^>]*\/>)<text [^>]*>([^<]*)<\/text><\/g>/g
    ),
    (m) => ({ more: m[1].includes('dg-badge-more'), style: m[2] || '', rect: m[3], text: m[4] })
  );
const findNode = (graph, id) => {
  for (const child of graph.children || []) {
    const found = child.id === id ? child : findNode(child, id);
    if (found) return found;
  }
  return null;
};

// ---- 1. Reading a colour ----

test('a colour of the workspace is read as #rgb, #rrggbb, rgb(), a CSS name (grey too, also after a #) or transparent', async () => {
  const { sandbox } = await openFixture();
  const read = (text) => plain(sandbox.parseCssColor(text));
  assert.deepEqual(read('#fa0'), { r: 255, g: 170, b: 0, a: 1 });
  assert.deepEqual(read('#DAF2E6'), { r: 0xda, g: 0xf2, b: 0xe6, a: 1 }, 'upper case');
  assert.deepEqual(read('  #2a6a4b '), { r: 0x2a, g: 0x6a, b: 0x4b, a: 1 }, 'spaces around');
  assert.deepEqual(read('rgb(10, 20,30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(read('lightgray'), { r: 211, g: 211, b: 211, a: 1 });
  assert.deepEqual(read('LightGray'), read('lightgray'), 'case does not matter');
  assert.deepEqual(read('grey'), read('gray'));
  assert.deepEqual(read('darkslategrey'), read('darkslategray'), 'grey inside a name');
  assert.deepEqual(read('#lightgray'), read('lightgray'), 'PlantUML writes a name after a #');
  assert.deepEqual(read('transparent'), { r: 0, g: 0, b: 0, a: 0 });
  assert.equal(sandbox.cssColorOf(sandbox.parseCssColor('#FA0')), '#ffaa00');
  assert.equal(sandbox.cssColorOf(sandbox.parseCssColor('transparent')), 'transparent');
  assert.equal(sandbox.cssColorOf(sandbox.parseCssColor('rgb(1, 2, 3)')), '#010203');
});

test('what is not a colour the editor can parse is nothing, never a string passed on', async () => {
  const { sandbox } = await openFixture();
  for (const value of [
    'red;} x{',
    '<script>',
    12,
    null,
    undefined,
    'rgba(1,2,3,.5)',
    '#12345',
    '#1234567',
    '#ggg',
    'rgb(256, 0, 0)',
    'rgb(1, 2)',
    'notacolor',
    '',
    '  ',
    {},
    [],
    true,
    'url(x)',
    'red blue'
  ]) {
    assert.equal(sandbox.parseCssColor(value), null, JSON.stringify(value));
  }
});

// ---- 2. Readable text, whatever the theme ----

test('on every CSS colour name the text computed from the fill reaches a contrast of 4.5', async () => {
  const { sandbox } = await openFixture();
  const entries = run(sandbox, "CSS_COLOR_TABLE.split(' ').filter(Boolean)");
  assert.ok(entries.length >= 140, 'the table holds the CSS names: ' + entries.length);
  for (const entry of entries) {
    const [name, hex] = entry.split(':');
    const fill = sandbox.parseCssColor(name);
    assert.equal(sandbox.cssColorOf(fill), '#' + hex, name + ' is read as its table says');
    const text = sandbox.readableTextColor(fill, null);
    assert.ok(sandbox.contrastRatio(text, fill) >= 4.5, name + ' reaches 4.5: ' + sandbox.contrastRatio(text, fill));
    assert.ok(['#000000', '#ffffff'].includes(sandbox.cssColorOf(text)), name + ': black or white');
  }
  assert.ok(
    entries.every((entry) => !entry.includes('grey')),
    'the table has no grey: it is read as gray'
  );
});

test("the text on the three colours of the user is black, and the contrast is WCAG 2's", async () => {
  const { sandbox } = await openFixture();
  for (const colour of ['lightgray', '#DAF2E6', '#FAECDD']) {
    assert.equal(sandbox.cssColorOf(sandbox.readableTextColor(sandbox.parseCssColor(colour), null)), '#000000', colour);
  }
  const black = sandbox.parseCssColor('#000'),
    white = sandbox.parseCssColor('#fff');
  assert.equal(Math.round(sandbox.contrastRatio(black, white) * 100) / 100, 21);
  assert.equal(sandbox.contrastRatio(white, white), 1);
  assert.equal(sandbox.contrastRatio(black, white), sandbox.contrastRatio(white, black), 'symmetric');
  // a dark fill takes white
  assert.equal(sandbox.cssColorOf(sandbox.readableTextColor(sandbox.parseCssColor('#336699'), null)), '#ffffff');
  assert.equal(sandbox.cssColorOf(sandbox.readableTextColor(sandbox.parseCssColor('navy'), null)), '#ffffff');
});

test('a font-color that reaches 4.5 on the fill is kept, one that does not is replaced, and without a fill it is ignored', async () => {
  const { sandbox } = await openFixture();
  const textOf = (style) => plain(sandbox.styleLookOf(style).vars)['--st-text'];
  assert.equal(
    textOf({ 'background-color': '#DAF2E6', 'font-color': '#003300' }),
    '#003300',
    "readable: the author's wish"
  );
  assert.equal(textOf({ 'background-color': '#DAF2E6', 'font-color': 'darkgreen' }), '#006400');
  assert.equal(textOf({ 'background-color': '#DAF2E6', 'font-color': '#EEEEEE' }), '#000000', 'pale on pale: replaced');
  assert.equal(
    textOf({ 'background-color': '#336699', 'font-color': 'black' }),
    '#ffffff',
    'dark on dark: replaced by the better one'
  );
  assert.equal(
    textOf({ 'background-color': '#DAF2E6', 'font-color': 'transparent' }),
    '#000000',
    'an invisible text is replaced'
  );
  assert.equal(textOf({ 'background-color': '#DAF2E6', 'font-color': 'nonsense;}' }), '#000000', 'garbage: computed');
  assert.equal(textOf({ 'background-color': '#DAF2E6' }), '#000000');
  assert.equal(textOf({ 'font-color': '#003300' }), undefined, "no fill, the box is the theme's: no text colour");
  assert.equal(textOf({ 'line-color': '#003300' }), undefined);
  assert.equal(
    textOf({ 'background-color': 'transparent', 'font-color': '#003300' }),
    undefined,
    "a transparent fill is the theme's too"
  );
});

test('the look does not depend on the theme: light and dark give the same variables, and the same drawing', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = userStyles();
  const root = sandbox.document.documentElement;
  const looks = {};
  const svgs = {};
  for (const theme of ['light', 'dark']) {
    root.setAttribute('data-theme', theme);
    looks[theme] = plain(sandbox.stereotypeLookOf(['external', 'new', 'changed']));
    svgs[theme] = draw(sandbox, kernel, 'overview', 'mailer').svg;
  }
  assert.deepEqual(looks.dark, looks.light);
  assert.equal(svgs.dark, svgs.light);
  assert.equal(looks.dark.vars['--st-text'], '#000000');
  assert.doesNotMatch(
    run(sandbox, 'readableTextColor.toString() + styleLookOf.toString()'),
    /data-theme|getAttribute|matchMedia|getComputedStyle/,
    'and the code does not look at the theme'
  );
});

// ---- 3. Looking a style up ----

test("by-tags overrides by-qualifiers for the same key, property by property; a key in only one of them is that one's", async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = {
    'by-qualifiers': { Both: { 'background-color': 'red', 'line-style': 4 }, OnlyQualifier: { 'line-color': 'blue' } },
    'by-tags': { Both: { 'background-color': 'green', 'line-color': 'navy' }, OnlyTag: { 'background-color': 'gold' } }
  };
  assert.deepEqual(plain(sandbox.stereotypeStyleOf('Both')), {
    'background-color': 'green',
    'line-style': 4,
    'line-color': 'navy'
  });
  assert.deepEqual(plain(sandbox.stereotypeStyleOf('OnlyQualifier')), { 'line-color': 'blue' });
  assert.deepEqual(plain(sandbox.stereotypeStyleOf('OnlyTag')), { 'background-color': 'gold' });
  assert.equal(sandbox.stereotypeStyleOf('Nothing'), null, 'not mentioned: not styled');
  assert.deepEqual(
    plain(sandbox.styledStereotypesOf(['Nothing', 'OnlyTag', 'Both'])),
    ['OnlyTag', 'Both'],
    'in the order of the list'
  );
});

test('a stereotype named like a property of Object is not a style: only own keys count', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = { 'by-tags': { external: { 'background-color': 'lightgray' } }, 'by-qualifiers': {} };
  for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
    assert.equal(sandbox.stereotypeStyleOf(name), null, name);
  }
  assert.deepEqual(plain(sandbox.styledStereotypesOf(['constructor', '__proto__', 'toString', 'external'])), [
    'external'
  ]);
  assert.doesNotMatch(sandbox.stereotypeBadgesHtml(['constructor', '__proto__', 'toString']), /stereotype-badge/);
  // the entry itself is read by own keys too
  const entry = Object.create({ 'background-color': 'red' });
  state.workspace.styles = { 'by-tags': { inherited: entry } };
  assert.deepEqual(plain(sandbox.stereotypeStyleOf('inherited')), {}, 'declared, and nothing of its own to draw');
});

test('a stereotype with an empty entry (`external:`) is declared with no property: a badge, no look', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = {
    'by-tags': {
      external: null,
      listed: ['a', 'b'],
      scalar: 'red',
      blank: { 'background-color': '  ', 'line-color': null }
    }
  };
  for (const name of ['external', 'listed', 'scalar', 'blank']) {
    assert.deepEqual(plain(sandbox.stereotypeStyleOf(name)), {}, name + ' is declared, with nothing');
    const look = sandbox.stereotypeLookOf([name]);
    assert.deepEqual(plain(look.styled), [name]);
    assert.equal(look.empty, true, name + ': nothing to draw');
    assert.deepEqual(plain(look.vars), {});
  }
  const badges = sandbox.stereotypeBadgesHtml(['external']);
  assert.match(badges, /<span class="stereotype-badge"[^>]*>external<\/span>/);
  assert.deepEqual(
    plain(sandbox.stereotypeBadgeVarsOf('external')),
    { '--st-fill': 'initial', '--st-stroke': 'initial', '--st-text': 'initial' },
    'the badge takes nothing of the box it sits in'
  );
});

test('styles that are not a mapping are no styles, and nothing throws', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const malformed = [
    undefined,
    null,
    [],
    ['external'],
    'external',
    42,
    true,
    { 'by-tags': [] },
    { 'by-tags': 'external' },
    { 'by-tags': null, 'by-qualifiers': 7 },
    { 'by-tags': ['external'], 'by-qualifiers': ['external'] }
  ];
  for (const styles of malformed) {
    state.workspace.styles = styles;
    const label = JSON.stringify(styles);
    assert.equal(sandbox.stereotypeStyleOf('external'), null, label);
    assert.deepEqual(plain(sandbox.styledStereotypesOf(['external', 'changed'])), [], label);
    assert.equal(sandbox.stereotypeBadgesHtml(['external']), '', label);
    assert.equal(sandbox.diagramLegendHtml(false, ['external']).includes('stereotype-badge'), false, label);
    assert.doesNotMatch(draw(sandbox, kernel, 'overview', 'mailer').svg, /dg-styled|dg-badge|style=/, label);
    assert.doesNotMatch(
      sandbox.renderTreeNodeHtml(state.index.application.get('mailer'), 1),
      /stereotype-badge/,
      label
    );
  }
  delete state.workspace.styles; // a workspace with no `styles` key at all
  assert.equal(sandbox.stereotypeStyleOf('external'), null);
  state.workspace = null;
  assert.equal(sandbox.stereotypeStyleOf('external'), null, 'not even a workspace');
});

// ---- 4. Precedence and properties ----

test('several stereotypes: a later one overrides an earlier one property by property', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = userStyles();
  const look = (names) => plain(sandbox.stereotypeLookOf(names));
  const a = look(['external', 'changed']);
  assert.deepEqual(a.styled, ['external', 'changed']);
  assert.equal(a.vars['--st-fill'], '#faecdd', 'changed comes later: its fill');
  assert.equal(a.vars['--st-stroke'], '#a2501c');
  const b = look(['changed', 'external']);
  assert.deepEqual(b.styled, ['changed', 'external'], 'the list keeps its order');
  assert.equal(b.vars['--st-fill'], '#d3d3d3', 'external comes later: its fill');
  assert.equal(b.vars['--st-stroke'], '#a2501c', "but it says nothing of the line: changed's stays");
  assert.equal(b.vars['--st-text'], '#000000');
  const c = look(['new', 'changed']);
  assert.equal(c.vars['--st-fill'], '#faecdd');
  assert.equal(c.vars['--st-stroke'], '#a2501c');
  assert.deepEqual(look(['changed', 'new']).vars['--st-fill'], '#daf2e6');
  assert.deepEqual(
    look(['Quarkus', 'unknown']),
    { styled: [], vars: {}, rx: null, shadow: false, empty: true },
    'unstyled stereotypes style nothing'
  );
  assert.equal(sandbox.stereotypeLookOf(undefined).empty, true, 'not a list');
  assert.equal(sandbox.stereotypeLookOf('external').empty, true, 'a string is not a list of stereotypes');
});

test('each property of a style is drawn as the design says', async () => {
  const { sandbox } = await openFixture();
  const look = (style) => plain(sandbox.styleLookOf(style));
  assert.equal(look({ 'line-thickness': 3 }).vars['--st-width'], '3px');
  assert.equal(look({ 'line-thickness': '3' }).vars['--st-width'], '3px', 'the YAML may hold a string');
  assert.equal(look({ 'line-style': 4 }).vars['--st-dash'], '4 4', 'a dash of N and a gap of N');
  assert.equal(look({ 'line-style': 0 }).vars['--st-dash'], 'none', 'zero is a solid line');
  assert.equal(look({ 'round-corner': 10 }).rx, 5, "PlantUML's N is a radius of N / 2");
  assert.equal(look({ 'round-corner': 0 }).rx, 0);
  assert.equal(look({ 'round-corner': 10 }).empty, false);
  assert.equal(look({}).rx, null, 'unset: the box keeps its own radius');
  assert.equal(look({ shadowing: true }).shadow, true);
  assert.equal(look({ shadowing: 'true' }).shadow, true);
  assert.equal(look({ shadowing: false }).shadow, false);
  assert.equal(look({ shadowing: 'no' }).shadow, false);
  assert.equal(look({ shadowing: true }).empty, false);
  assert.equal(look({ 'font-style': 'bold' }).vars['--st-weight'], '700');
  assert.equal(look({ 'font-style': 'italic' }).vars['--st-fstyle'], 'italic');
  assert.equal(look({ 'font-style': 'plain' }).vars['--st-weight'], '400');
  assert.equal(look({ 'font-style': 'normal' }).vars['--st-weight'], '400');
  assert.deepEqual(look({ 'font-style': 'bold italic' }).vars, { '--st-weight': '700', '--st-fstyle': 'italic' });
  assert.deepEqual(look({ 'font-style': 'underlined' }).vars, {}, 'a word the editor cannot draw');
  assert.deepEqual(look({ 'font-style': 7 }).vars, {});
  assert.equal(look({ 'line-color': 'navy' }).vars['--st-stroke'], '#000080');
  assert.equal(
    look({ 'line-color': 'navy' }).vars['--st-stroke-opacity'],
    '1',
    'a chosen line is not the faded one of a compound'
  );
  assert.equal(look({ 'background-color': 'navy' }).vars['--st-fill'], '#000080');
  assert.deepEqual(look({}), { vars: {}, rx: null, shadow: false, empty: true });
  assert.deepEqual(look(null), { vars: {}, rx: null, shadow: false, empty: true });
  assert.deepEqual(
    look({ 'something-else': 'red', 'line-color': 'navy' }).vars,
    { '--st-stroke': '#000080', '--st-stroke-opacity': '1' },
    'a key the CLI does not know is not drawn'
  );
});

test('values that are not whole numbers are ignored, and never reach the variables', async () => {
  const { sandbox } = await openFixture();
  for (const bad of [
    '3;color:red',
    2.5,
    '2.5',
    -1,
    '-1',
    'abc',
    '',
    NaN,
    Infinity,
    null,
    [],
    {},
    true,
    '3px',
    ' 3 4',
    '1e2'
  ]) {
    const look = plain(sandbox.styleLookOf({ 'line-thickness': bad, 'line-style': bad, 'round-corner': bad }));
    assert.deepEqual(look.vars, {}, JSON.stringify(bad) + ' (' + typeof bad + ')');
    assert.equal(look.rx, null, JSON.stringify(bad));
    assert.equal(look.empty, true);
  }
  assert.equal(
    plain(sandbox.styleLookOf({ 'line-thickness': ' 3 ' })).vars['--st-width'],
    '3px',
    'spaces around a whole number are fine'
  );
});

// ---- 5. Hostile values ----

/** Every `style="…"` of a piece of markup must hold nothing but `--st-…: <value this file generated>` declarations. */
function assertOnlyGeneratedStyles(markup, what) {
  const attributes = Array.from(markup.matchAll(/ style="([^"]*)"/g), (m) => m[1]);
  for (const attribute of attributes) {
    if (/^--level:\d+$/.test(attribute)) continue; // the depth of a tree row
    for (const declaration of attribute.split(';')) {
      assert.match(
        declaration,
        /^--st-(fill|stroke|text|stroke-opacity|width|dash|weight|fstyle):(#[0-9a-f]{6}|transparent|initial|\d+px|\d+ \d+|none|1|700|400|italic)$/,
        what + ': ' + attribute
      );
    }
  }
  return attributes.length;
}

test('a hostile value in styles never reaches the markup: not the SVG, not a row, not the legend', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const hostile = {
    'background-color': 'red;} x{',
    'line-color': '"><script>alert(1)</script>',
    'line-thickness': '3;color:red',
    'line-style': '1;x',
    'round-corner': '<b>',
    'font-color': 'url(javascript:alert(1))',
    'font-style': 'bold;}x{',
    shadowing: '"><i>'
  };
  state.workspace.styles = {
    'by-tags': { external: hostile, changed: hostile },
    'by-qualifiers': { external: hostile }
  };
  const mailer = state.index.application.get('mailer');
  const all = [
    draw(sandbox, kernel, 'overview', 'mailer').svg,
    draw(sandbox, kernel, 'deep', 'shop').svg,
    sandbox.renderTreeNodeHtml(mailer, 1),
    sandbox.renderMapScopeNodeHtml(mailer, 1),
    sandbox.diagramLegendHtml(false, ['external', 'changed']),
    sandbox.stereotypeBadgesHtml(['external', 'changed'])
  ];
  for (const markup of all) {
    assert.doesNotMatch(markup, /<script|;}|alert|color:red|x\{|javascript|<b>|<i>/, 'nothing of the hostile text');
    assertOnlyGeneratedStyles(markup, 'markup');
  }
  // the one thing that survives is the shadow of `shadowing: "…"`, a string that is not true: nothing
  assert.doesNotMatch(all[0], /dg-shadow/);
  assert.match(all[0], /class="dg-badge"/, 'the stereotypes are still declared: badges with no look of their own');
});

test('the values the user really writes come out as generated declarations only', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = userStyles();
  state.workspace.styles['by-tags'].changed['line-style'] = 3;
  state.workspace.styles['by-tags'].changed['line-thickness'] = 2;
  state.workspace.styles['by-tags'].changed['font-style'] = 'bold italic';
  const svg = draw(sandbox, kernel, 'overview', 'mailer').svg;
  assert.ok(assertOnlyGeneratedStyles(svg, 'svg') >= 3, 'the box and its two pills');
  assertOnlyGeneratedStyles(sandbox.renderTreeNodeHtml(state.index.application.get('mailer'), 1), 'row');
});

test('a hostile stereotype name is escaped wherever it is shown', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const evil = 'a"><b>';
  const mailer = state.index.application.get('mailer');
  mailer.qualifiers = (mailer.qualifiers || []).concat([evil]);
  state.workspace.styles = { 'by-qualifiers': { [evil]: { 'background-color': 'red' } } };
  const escaped = 'a&quot;&gt;&lt;b&gt;';
  const svg = draw(sandbox, kernel, 'overview', 'mailer').svg;
  assert.ok(svg.includes('>' + escaped + '<'), 'the pill says it');
  assert.ok(!svg.includes(evil) && !/<b[ >]/.test(svg), 'and the SVG holds no tag of it');
  assert.ok(attributeOf(openingTag(nodeOf(svg, 'mailer')), 'aria-label').endsWith(escaped), 'the spoken label too');
  assert.ok(svg.includes('Stereotypes: ' + escaped) || svg.includes(escaped), 'and the tooltip');
  for (const markup of [
    sandbox.renderTreeNodeHtml(mailer, 1),
    sandbox.renderMapScopeNodeHtml(mailer, 1),
    sandbox.diagramLegendHtml(false, [evil]),
    sandbox.stereotypeBadgesHtml([evil])
  ]) {
    assert.ok(markup.includes(escaped), 'escaped');
    assert.ok(!markup.includes(evil) && !/<b[ >]/.test(markup), 'no tag of it');
  }
});

// ---- 6. The boxes of a diagram ----

test('the box of a styled element carries the look of its stereotypes and one pill each, in order', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = userStyles();
  const { svg } = draw(sandbox, kernel, 'overview', 'mailer');
  const node = nodeOf(svg, 'mailer');
  const tag = openingTag(node);
  assert.ok(attributeOf(tag, 'class').split(' ').includes('dg-styled'));
  assert.ok(
    attributeOf(tag, 'class').split(' ').includes('dg-focal'),
    "the focal outline is still the box's own class"
  );
  assert.ok(!attributeOf(tag, 'class').includes('dg-shadow'));
  const style = attributeOf(tag, 'style');
  assert.ok(style.includes('--st-fill:#faecdd'), "changed's fill (later wins): " + style);
  assert.ok(style.includes('--st-stroke:#a2501c'));
  assert.ok(style.includes('--st-text:#000000'));
  assert.match(node, /<rect class="dg-box" [^>]* rx="6"\/>/, 'no round-corner: the usual radius');
  assert.equal(attributeOf(tag, 'role'), 'link', 'what a box is for did not change');
  assert.equal(attributeOf(tag, 'data-action'), 'goto-element');
  assert.equal(attributeOf(tag, 'data-ref'), 'mailer');
  assert.equal(attributeOf(tag, 'tabindex'), '0');

  const pills = badgesOf(node);
  assert.deepEqual(
    pills.map((p) => p.text),
    ['external', 'changed']
  );
  assert.ok(
    pills[0].style.includes('--st-fill:#d3d3d3') && pills[0].style.includes('--st-text:#000000'),
    "external's own fill: " + pills[0].style
  );
  assert.ok(!pills[0].style.includes('#faecdd'), 'not the fill of the box');
  assert.ok(
    !pills[0].style.includes('#a2501c'),
    "external says nothing of its line: the pill does not inherit the box's"
  );
  assert.ok(
    pills[0].style.includes('--st-stroke:#7f7f7f'),
    'it has the outline derived from its own fill: ' + pills[0].style
  );
  assert.ok(
    pills[1].style.includes('--st-fill:#faecdd') && pills[1].style.includes('--st-stroke:#a2501c'),
    "changed's own: " + pills[1].style
  );
  assert.ok(pills.every((p) => !p.more));

  assert.ok(attributeOf(tag, 'aria-label').endsWith(', external, changed'), attributeOf(tag, 'aria-label'));
  assert.ok(attributeOf(tag, 'aria-label').startsWith('Mail Provider [system]'));
  assert.match(node, /<title>[^<]*Stereotypes: external, changed<\/title>/, 'the tooltip lists them');
  // the pills sit inside the box, one after the other
  const xs = pills.map((p) => Number(/ x="([\d.]+)"/.exec(p.rect)[1]));
  assert.ok(xs[1] > xs[0]);
});

test('a round-corner is the radius of the box, N / 2; a shadow is a class', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = userStyles();
  state.workspace.styles['by-tags'].changed['round-corner'] = 10;
  state.workspace.styles['by-tags'].changed.shadowing = true;
  state.workspace.styles['by-tags'].changed['line-thickness'] = 3;
  state.workspace.styles['by-tags'].changed['line-style'] = 5;
  const node = nodeOf(draw(sandbox, kernel, 'overview', 'mailer').svg, 'mailer');
  assert.match(node, /<rect class="dg-box" [^>]* rx="5"\/>/);
  assert.ok(attributeOf(openingTag(node), 'class').split(' ').includes('dg-shadow'));
  const style = attributeOf(openingTag(node), 'style');
  assert.ok(style.includes('--st-width:3px') && style.includes('--st-dash:5 5'), style);
});

test('a box with no styled stereotype is byte for byte what it was without styles', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = {};
  const bare = draw(sandbox, kernel, 'overview', 'mailer');
  state.workspace.styles = userStyles();
  const styled = draw(sandbox, kernel, 'overview', 'mailer');
  for (const id of ['customer', 'shop']) {
    assert.equal(nodeOf(styled.svg, id), nodeOf(bare.svg, id), id);
    assert.doesNotMatch(openingTag(nodeOf(styled.svg, id)), /dg-styled|style=/);
  }
  assert.doesNotMatch(
    bare.svg,
    /dg-styled|dg-badge|dg-shadow|style=/,
    'and a workspace without styles draws none of it'
  );
  assert.deepEqual(
    plain(findNode(bare.graph, 'customer')),
    plain(findNode(styled.graph, 'customer')),
    'nor does its place in the layout change'
  );
  // the links are the same too
  assert.equal(
    styled.svg.replace(
      /<g class="dg-node dg-leaf[^>]*data-id="mailer"[\s\S]*?(?=<g class="dg-node|<g class="dg-link"|<text class="dg-label"|<\/svg>)/,
      ''
    ),
    bare.svg.replace(
      /<g class="dg-node dg-leaf[^>]*data-id="mailer"[\s\S]*?(?=<g class="dg-node|<g class="dg-link"|<text class="dg-label"|<\/svg>)/,
      ''
    ),
    'everything but the styled box'
  );
  assert.doesNotMatch(
    attributeOf(openingTag(nodeOf(bare.svg, 'mailer')), 'aria-label'),
    /external/,
    'unstyled stereotypes are not said by the label (the tooltip still can)'
  );
});

test('nothing is tied to external, new or changed: any stereotype the workspace styles is drawn the same way', async () => {
  const { sandbox, state, kernel } = await openFixture();
  // a stereotype nobody has heard of, put on a record in the model: the kernel tells it, the styles give it a look
  const mailer = state.index.application.get('mailer');
  mailer.tags['rendering-stereotypes'] = 'zz-made-up external';
  state.workspace.styles = {
    'by-tags': { 'zz-made-up': { 'background-color': '#336699', 'line-color': 'gold', 'round-corner': 20 } }
  };
  let node = nodeOf(draw(sandbox, kernel, 'overview', 'mailer').svg, 'mailer');
  let tag = openingTag(node);
  assert.ok(attributeOf(tag, 'class').split(' ').includes('dg-styled'));
  assert.ok(
    attributeOf(tag, 'style').includes('--st-fill:#336699') && attributeOf(tag, 'style').includes('--st-stroke:#ffd700')
  );
  assert.ok(attributeOf(tag, 'style').includes('--st-text:#ffffff'), 'white on a dark fill');
  assert.match(node, /<rect class="dg-box" [^>]* rx="10"\/>/);
  assert.deepEqual(
    badgesOf(node).map((p) => p.text),
    ['zz-made-up'],
    'external is not styled in this workspace: no pill'
  );
  assert.ok(attributeOf(tag, 'aria-label').endsWith(', zz-made-up'));

  // a qualifier styled through by-qualifiers on a leaf, and on a box that contains others (deep view)
  state.workspace.styles = {
    'by-qualifiers': {
      PostgreSQL: { 'background-color': '#336699' },
      Quarkus: { 'background-color': 'gold', 'line-color': 'navy' }
    }
  };
  const deep = draw(sandbox, kernel, 'deep', 'shop');
  const db = nodeOf(deep.svg, 'shop.catalog.db');
  assert.ok(attributeOf(openingTag(db), 'style').includes('--st-fill:#336699'));
  assert.deepEqual(
    badgesOf(db).map((p) => p.text),
    ['PostgreSQL']
  );
  const service = nodeOf(deep.svg, 'shop.catalog.service');
  tag = openingTag(service);
  assert.ok(
    attributeOf(tag, 'class').split(' ').includes('dg-compound') &&
      attributeOf(tag, 'class').split(' ').includes('dg-styled')
  );
  assert.ok(
    attributeOf(tag, 'style').includes('--st-fill:#ffd700') && attributeOf(tag, 'style').includes('--st-stroke:#000080')
  );
  assert.ok(
    attributeOf(tag, 'style').includes('--st-text:#000000'),
    'the title and the kind line of a compound take the computed text colour too'
  );
  assert.match(service, /<rect class="dg-group" /);
  assert.deepEqual(
    badgesOf(service).map((p) => p.text),
    ['Quarkus'],
    'at the right of the header'
  );
  // the pill is in the header: y = top + 10, right-aligned inside the box
  const group = /<rect class="dg-group" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(service);
  const pill = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="16"/.exec(badgesOf(service)[0].rect);
  assert.equal(Number(pill[2]), Number(group[2]) + 10);
  assert.equal(Number(pill[1]) + Number(pill[3]), Number(group[1]) + Number(group[3]) - 8);
  // the other boxes of the view are as they were
  assert.doesNotMatch(openingTag(nodeOf(deep.svg, 'shop.web.api')), /dg-styled/);

  // a folded box takes the look on its stack too
  const folded = draw(sandbox, kernel, 'deep', 'shop.catalog', { input: { collapsed: ['shop.catalog.service'] } });
  const stack = nodeOf(folded.svg, 'shop.catalog.service');
  assert.match(stack, /<rect class="dg-box dg-stack" /);
  assert.ok(
    attributeOf(openingTag(stack), 'class').includes('dg-folded') &&
      attributeOf(openingTag(stack), 'class').includes('dg-styled')
  );
});

test("the stereotypes are the kernel's: a box the editor adds itself (a ghost) is not styled", async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = {
    'by-tags': { 'shop.nowhere': { 'background-color': 'red' }, external: { 'background-color': 'red' } }
  };
  const item = {
    id: 'ghost:shop.web.api>shop.nowhere',
    reference: 'shop.nowhere',
    parent: null,
    ghost: true,
    owner: 'shop.web.api',
    collapsed: false,
    hidden: 0
  };
  const text = sandbox.diagramItemText(item, {});
  assert.deepEqual(plain(text.badges), []);
  assert.equal(text.look.empty, true);
  const result = { items: [item], links: [] };
  const svg = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, 'x', { map: false }).html;
  assert.doesNotMatch(svg, /dg-styled|dg-badge/);
  assert.match(svg, /dg-ghost/);
  // an item with no `stereotypes` at all (an older answer) is handled
  const bare = { id: 'mailer', reference: 'mailer', parent: null, collapsed: false, hidden: 0 };
  assert.deepEqual(plain(sandbox.diagramItemText(bare, {}).badges), []);
});

// ---- 7. The layout and the drawing agree ----

test('the layout gives a leaf with badges the height the drawing uses, 22 pixels more than without', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = {};
  const without = draw(sandbox, kernel, 'overview', 'mailer');
  state.workspace.styles = userStyles();
  const withBadges = draw(sandbox, kernel, 'overview', 'mailer');
  const a = findNode(without.graph, 'mailer'),
    b = findNode(withBadges.graph, 'mailer');
  assert.equal(b.height - a.height, 22);
  assert.ok(b.width >= a.width, 'never narrower');
  const item = withBadges.result.items.find((i) => i.id === 'mailer');
  const text = sandbox.diagramItemText(item, {});
  assert.equal(b.height, sandbox.diagramLeafLayout(text, b.width, {}).height, 'one function for both');
  assert.equal(a.height, sandbox.diagramLeafLayout(Object.assign({}, text, { badges: [] }), a.width, {}).height);
  // the pills fit in the box the layout reserved: the drawing puts them 10 pixels above the bottom
  const node = nodeOf(withBadges.svg, 'mailer');
  const box = /<rect class="dg-box" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(node);
  const pills = badgesOf(node).map((p) =>
    /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="16"/.exec(p.rect).slice(1).map(Number)
  );
  for (const [x, y, w] of pills) {
    assert.equal(y + 16, Number(box[2]) + Number(box[4]) - 10, 'the bottom of the pills');
    assert.ok(x >= Number(box[1]) && x + w <= Number(box[1]) + Number(box[3]), 'inside the width');
  }
  // with the lines of text taller (descriptions, wrap) the pills still sit under all of them
  const options = { descriptions: true, wrap: true };
  const tall = draw(sandbox, kernel, 'overview', 'mailer', { graph: options });
  const tallNode = findNode(tall.graph, 'mailer');
  const tallText = sandbox.diagramItemText(
    tall.result.items.find((i) => i.id === 'mailer'),
    options
  );
  assert.equal(tallNode.height, sandbox.diagramLeafLayout(tallText, tallNode.width, options).height);
  assert.ok(tallNode.height > b.height, 'a description makes it taller, the pills under it');
  assert.ok(
    tallNode.height -
      sandbox.diagramLeafLayout(Object.assign({}, tallText, { badges: [] }), tallNode.width, options).height ===
      22,
    'by the same 22 pixels'
  );
});

test('the minimum width of a box that contains others grows by the width of its badges', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const minimum = (graph, id) =>
    Number(/^\(0, (\d+)\)$/.exec(findNode(graph, id).layoutOptions['elk.nodeSize.minimum'])[1]);
  state.workspace.styles = {};
  const bare = draw(sandbox, kernel, 'deep', 'shop').graph;
  state.workspace.styles = { 'by-qualifiers': { Quarkus: { 'background-color': 'gold' } } };
  const styled = draw(sandbox, kernel, 'deep', 'shop').graph;
  assert.equal(
    minimum(styled, 'shop.catalog.service') - minimum(bare, 'shop.catalog.service'),
    sandbox.diagramBadgeRow(['Quarkus'], Infinity).width
  );
  assert.ok(sandbox.diagramBadgeRow(['Quarkus'], Infinity).width > 40);
  assert.equal(minimum(styled, 'shop.catalog'), minimum(bare, 'shop.catalog'), 'a box with no badge asks the same');
  assert.equal(minimum(styled, 'shop'), minimum(bare, 'shop'));
  // a leaf with a badge gets the room for it
  state.workspace.styles = { 'by-qualifiers': { 'Spring Boot': {}, Angular: {} } };
  const leaves = draw(sandbox, kernel, 'deep', 'shop').graph;
  const wanted = Math.min(280, sandbox.diagramBadgeRow(['Spring Boot'], Infinity).width + 20);
  assert.ok(findNode(leaves, 'shop.web.api').width >= wanted, 'room for the pill, up to the cap of 280');
  assert.ok(
    findNode(leaves, 'shop.web.frontend').width >=
      Math.min(280, sandbox.diagramBadgeRow(['Angular'], Infinity).width + 20)
  );
});

test('a row of pills that is too wide keeps what fits and a +N pill for the rest; with room it holds them all', async () => {
  const { sandbox } = await openFixture();
  const row = (names, max) => plain(sandbox.diagramBadgeRow(names, max));
  const all = row(['external', 'changed', 'new'], Infinity);
  assert.deepEqual(
    all.pills.map((p) => p.label),
    ['external', 'changed', 'new']
  );
  assert.deepEqual(
    all.pills.map((p) => p.name),
    ['external', 'changed', 'new']
  );
  assert.equal(all.width, all.pills.reduce((s, p) => s + p.width, 0) + 2 * 4, 'pills and the gaps between them');
  assert.deepEqual(row(['external', 'changed', 'new'], all.width).pills, all.pills, 'exactly enough room');

  const tiny = row(['external', 'changed', 'new'], 30);
  assert.deepEqual(
    tiny.pills.map((p) => p.label),
    ['+3']
  );
  assert.equal(tiny.pills[0].name, null, 'the +N pill stands for no stereotype');
  const some = row(['external', 'changed', 'new'], all.pills[0].width + 4 + row(['+2'], Infinity).width);
  assert.deepEqual(
    some.pills.map((p) => p.label),
    ['external', '+2'],
    'what fits first, the count of the rest'
  );
  assert.ok(some.width <= all.pills[0].width + 4 + row(['+2'], Infinity).width);
  assert.equal(row(['external'], 0).pills[0].label, '+1');
  assert.deepEqual(row([], 100), { pills: [], width: 0 });

  // a name past 16 characters is cut, the pill says so
  const long = row(['a-very-long-stereotype-name'], Infinity);
  assert.equal(long.pills[0].label.length, 16);
  assert.ok(long.pills[0].label.endsWith('…'));
  assert.equal(long.pills[0].name, 'a-very-long-stereotype-name', "but its style is the full name's");

  // drawn: the +N pill is a pill of its own look
  const svg = sandbox.diagramBadgesSvg(sandbox.diagramBadgeRow(['external', 'changed'], 40), 0, 0);
  assert.match(svg, /<g class="dg-badge dg-badge-more" aria-hidden="true"><rect [^>]*\/><text [^>]*>\+2<\/text><\/g>/);
});

// ---- 8. The rows of the trees ----

test('a row of the Elements tree carries the badges after its label, said in its label before "modified", next to the modified dot', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = userStyles();
  state.dirtyReferences.add('application:mailer');
  const row = sandbox.renderTreeNodeHtml(state.index.application.get('mailer'), 1);
  assert.match(row, /aria-label="Mail Provider, external, changed, modified"/);
  assert.match(row, /data-aria="Mail Provider, external, changed, modified"/);
  const badges = Array.from(
    row.matchAll(/<span class="stereotype-badge" style="([^"]*)" title="Stereotype: (\w+)">(\w+)<\/span>/g),
    (m) => ({ style: m[1], title: m[2], text: m[3] })
  );
  assert.deepEqual(
    badges.map((b) => b.text),
    ['external', 'changed']
  );
  assert.deepEqual(
    badges.map((b) => b.title),
    ['external', 'changed']
  );
  assert.ok(
    badges[0].style.includes('--st-fill:#d3d3d3') &&
      badges[1].style.includes('--st-fill:#faecdd') &&
      badges[1].style.includes('--st-stroke:#a2501c')
  );
  assert.ok(row.indexOf('tree-node-label') < row.indexOf('stereotype-badge'), 'after the label');
  // the dot of unsaved changes is another thing: still there, after the badges, with its own class and no text
  assert.match(row, /<span class="modified-dot" aria-hidden="true" title="This element has unsaved changes"><\/span>/);
  assert.ok(row.indexOf('stereotype-badge') < row.indexOf('modified-dot'));
  assert.ok(!/class="stereotype-badge[^>]*modified/.test(row), 'a badge never says modified');
  assert.equal((row.match(/modified-dot/g) || []).length, 1);
  assert.equal(CSS.includes('.modified-dot'), true);
  // without unsaved changes: the badges, no dot
  state.dirtyReferences.clear();
  const clean = sandbox.renderTreeNodeHtml(state.index.application.get('mailer'), 1);
  assert.match(clean, /aria-label="Mail Provider, external, changed"/);
  assert.doesNotMatch(clean, /modified/);
  // payments has the one stereotype
  const payments = sandbox.renderTreeNodeHtml(state.index.application.get('shop.payments'), 3);
  assert.match(payments, /aria-label="Payment Provider, external"/);
  assert.equal((payments.match(/class="stereotype-badge"/g) || []).length, 1);
});

test('a row with no styled stereotype is what it was without styles', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = {};
  const render = (ref) => sandbox.renderTreeNodeHtml(state.index.application.get(ref), 1);
  const before = ['customer', 'shop', 'shop.web.api', 'shop.catalog.db']
    .map(render)
    .concat([sandbox.renderMapScopeNodeHtml(state.index.application.get('customer'), 1)]);
  assert.ok(before.every((html) => !html.includes('stereotype-badge')));
  state.workspace.styles = userStyles();
  const after = ['customer', 'shop', 'shop.web.api', 'shop.catalog.db']
    .map(render)
    .concat([sandbox.renderMapScopeNodeHtml(state.index.application.get('customer'), 1)]);
  assert.deepEqual(after, before, 'byte for byte, though Quarkus & co. are stereotypes of some of them');
  // the stereotypes of the workspace that are unstyled are in no label either
  assert.match(before[2], /aria-label="[^"]*"/);
  assert.doesNotMatch(before[2], /Spring Boot/);
  // a row of the technology layer gets them too
  state.workspace.styles = { 'by-qualifiers': {} };
  const node = state.index.technology.get('prod.cluster.web');
  node.qualifiers = (node.qualifiers || []).concat(['hot']);
  state.workspace.styles = { 'by-qualifiers': { hot: { 'background-color': 'orange' } } };
  assert.match(sandbox.renderTreeNodeHtml(node, 2), /<span class="stereotype-badge"[^>]*>hot<\/span>/);
});

test('a row of the Map scope tree carries the badges and says its stereotypes after its name', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = userStyles();
  const row = sandbox.renderMapScopeNodeHtml(state.index.application.get('mailer'), 1);
  assert.match(row, /data-stereotypes="external, changed"/);
  assert.match(row, /aria-label="Mail Provider, external, changed"/);
  assert.deepEqual(
    Array.from(row.matchAll(/<span class="stereotype-badge"[^>]*>(\w+)<\/span>/g), (m) => m[1]),
    ['external', 'changed']
  );
  assert.ok(
    row.indexOf('tree-node-label') < row.indexOf('stereotype-badge') &&
      row.indexOf('stereotype-badge') < row.indexOf('map-scope-actions'),
    'between the label and the buttons'
  );
  assert.equal(
    sandbox.mapScopeRowLabel('Mail Provider', false, false, false, 'external, changed'),
    'Mail Provider, external, changed'
  );
  assert.equal(
    sandbox.mapScopeRowLabel('Mail Provider', true, false, false, 'external, changed'),
    'Mail Provider, external, changed, pinned',
    'the stereotypes come before the state'
  );
  assert.equal(
    sandbox.mapScopeRowLabel('Mail Provider', false, true, false, 'external'),
    'Mail Provider, external, hidden'
  );
  assert.equal(
    sandbox.mapScopeRowLabel('Mail Provider', false, false, true, ''),
    'Mail Provider, not on the map',
    'none: as before'
  );
  assert.equal(sandbox.mapScopeRowLabel('Mail Provider', false, false, true, null), 'Mail Provider, not on the map');
  assert.equal(sandbox.mapScopeRowLabel('Mail Provider', true, false, false), 'Mail Provider, pinned');
  const plainRow = sandbox.renderMapScopeNodeHtml(state.index.application.get('customer'), 1);
  assert.doesNotMatch(plainRow, /data-stereotypes|stereotype-badge/);
  assert.match(plainRow, /aria-label="Customer"/);
});

// ---- 9. The mirror of the kernel ----

test('the stereotypes of a record are the ones the kernel tells, for every element of both layers', async () => {
  const { sandbox, state, kernel } = await openFixture();
  let compared = 0,
    withStereotypes = 0,
    total = 0;
  for (const layer of ['application', 'technology']) {
    for (const record of state.index[layer].values()) {
      total++;
      const { input } = sandbox.buildKernelInput('overview', record.reference, { layer });
      const result = kernel.compute(input);
      if (result.error) continue; // an element with no relationship has no overview
      const item = result.items.find((i) => i.id === record.reference);
      assert.ok(item, layer + ':' + record.reference + ' is in its own overview');
      assert.deepEqual(
        plain(sandbox.stereotypesOfRecord(record)),
        plain(item.stereotypes),
        layer + ':' + record.reference
      );
      compared++;
      if (item.stereotypes.length) withStereotypes++;
    }
  }
  assert.ok(total >= 20, 'both layers of the fixture: ' + total);
  assert.ok(compared >= total * 0.7, 'most were compared: ' + compared + ' of ' + total);
  assert.ok(withStereotypes >= 6, 'and some of them have stereotypes: ' + withStereotypes);
});

test("the rule is the kernel's: whole qualifiers, then the words of rendering-stereotypes, once each", async () => {
  const { sandbox, state, kernel } = await openFixture();
  const of = (qualifiers, tags) => plain(sandbox.stereotypesOfRecord({ qualifiers, tags }));
  assert.deepEqual(of([], { 'rendering-stereotypes': 'external changed' }), ['external', 'changed']);
  assert.deepEqual(of([], { 'rendering-stereotypes': '  new\tchanged  ' }), ['new', 'changed']);
  assert.deepEqual(of([], { 'rendering-stereotypes': 'new\nchanged' }), ['new', 'changed']);
  assert.deepEqual(of([], { 'rendering-stereotypes': 'external external changed external' }), ['external', 'changed']);
  assert.deepEqual(
    of(['external'], { 'rendering-stereotypes': 'external changed' }),
    ['external', 'changed'],
    'a qualifier and a word are one stereotype'
  );
  assert.deepEqual(of(['Spring Boot', 'Spring Boot'], {}), ['Spring Boot'], 'a qualifier is whole');
  assert.deepEqual(
    of(['Spring Boot'], { 'rendering-stereotypes': 'a b' }),
    ['Spring Boot', 'a', 'b'],
    'qualifiers first'
  );
  assert.deepEqual(of(undefined, undefined), []);
  assert.deepEqual(of([null, '', 'x'], {}), ['x'], 'an empty entry of the YAML is no stereotype');
  assert.deepEqual(of([], { 'rendering-stereotypes': '' }), []);
  assert.deepEqual(of([], { 'rendering-stereotypes': 42 }), ['42'], 'a number of the YAML is text');
  assert.deepEqual(of([], { other: 'external' }), [], 'only that tag');
  // and the kernel agrees on each of those, on a real element
  const mailer = state.index.application.get('mailer');
  const cases = [
    [[], '  new\tchanged  '],
    [[], 'external external changed external'],
    [['external'], 'external changed'],
    [['Spring Boot', 'Spring Boot'], 'a b'],
    [[], ''],
    [['Q'], undefined],
    [[], 'one\ntwo']
  ];
  for (const [qualifiers, tag] of cases) {
    mailer.qualifiers = qualifiers;
    if (tag === undefined) delete mailer.tags['rendering-stereotypes'];
    else mailer.tags['rendering-stereotypes'] = tag;
    const result = kernel.compute(sandbox.buildKernelInput('overview', 'mailer').input);
    assert.deepEqual(
      plain(sandbox.stereotypesOfRecord(mailer)),
      plain(result.items.find((i) => i.id === 'mailer').stereotypes),
      JSON.stringify([qualifiers, tag])
    );
  }
});

// ---- 10. The legend ----

test('the legend lists each styled stereotype of the diagram once, as a badge, and nothing else about stereotypes', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = userStyles();
  const legend = sandbox.diagramLegendHtml(false, ['external', 'changed', 'Quarkus']);
  const names = Array.from(legend.matchAll(/<span class="stereotype-badge"[^>]*>([^<]*)<\/span>/g), (m) => m[1]);
  assert.deepEqual(names, ['external', 'changed']);
  assert.doesNotMatch(legend, /Quarkus/);
  assert.match(legend, /<span class="dg-legend-stereotypes" role="group" aria-label="Stereotypes">/);
  assert.ok(
    legend.startsWith('<svg') && legend.includes(' direct ') && legend.includes(' grouped'),
    'the key to the lines is still first'
  );
  assert.ok(legend.indexOf(' grouped') < legend.indexOf('stereotype-badge'));
  assert.ok(legend.includes('unknown element') === false);
  assert.ok(sandbox.diagramLegendHtml(true, ['external']).includes('unknown element'));

  const none = sandbox.diagramLegendHtml(false, []);
  assert.doesNotMatch(none, /stereotype|dg-legend-stereotypes/);
  assert.ok(none.endsWith(' grouped'), 'what it was');
  assert.equal(sandbox.diagramLegendHtml(false), none, 'no list at all is no stereotype');
  assert.equal(sandbox.diagramLegendHtml(false, ['Quarkus', 'unknown']), none, 'none styled: none shown');
  state.workspace.styles = {};
  assert.equal(sandbox.diagramLegendHtml(false, ['external', 'changed']), none, 'a workspace without styles');
  // the page builds that list from the boxes drawn, each stereotype once, and the ghosts have none
  const mount = sandbox.computeDiagramScene.toString(); // the page draws through `computeDiagramScene` (the editor's `mountDiagramIfNeeded` and the story player share it, wave 021)
  assert.match(mount, /drawnStereotypes\.includes\(name\)/);
  assert.match(mount, /item\.ghost \|\| !Array\.isArray\(item\.stereotypes\)/);
  assert.match(mount, /diagramLegendHtml\(ghosts\.items\.length > 0, drawnStereotypes\)/);
});

// ---- 11. The export ----

test('the CSS of the export carries the styled rules, read from the inline variables, with the colours of the theme as fallbacks', async () => {
  const { sandbox } = await openFixture();
  const themes = {
    light: {
      '--bg': '#fcfcfc',
      '--panel-bg': '#f1f1f1',
      '--border': '#dddddd',
      '--muted': '#667788',
      '--fg': '#111111',
      '--accent': '#0a66cc',
      '--danger': '#cc0000'
    },
    dark: {
      '--bg': '#1c1c1c',
      '--panel-bg': '#222222',
      '--border': '#444444',
      '--muted': '#99aabb',
      '--fg': '#eeeeee',
      '--accent': '#66aaff',
      '--danger': '#ff6666'
    }
  };
  const cssOf = (theme) => {
    sandbox.getComputedStyle = () => ({ getPropertyValue: (name) => ' ' + themes[theme][name] + ' ' });
    return sandbox.diagramExportCss();
  };
  for (const theme of ['light', 'dark']) {
    const css = cssOf(theme);
    const t = themes[theme];
    assert.ok(
      css.includes(
        '.dg-styled>.dg-box{fill:var(--st-fill,' + t['--bg'] + ');stroke:var(--st-stroke,' + t['--border'] + ');'
      ),
      theme
    );
    assert.ok(css.includes('.dg-styled>.dg-stack{fill:var(--st-fill,' + t['--panel-bg'] + ')}'), theme);
    assert.ok(
      css.includes('.dg-styled>.dg-group{fill:var(--st-fill,none);stroke:var(--st-stroke,' + t['--muted'] + ');'),
      theme
    );
    assert.ok(css.includes('.dg-styled .dg-title{fill:var(--st-text,' + t['--fg'] + ')'), theme);
    assert.ok(css.includes('.dg-styled .dg-sub,.dg-styled .dg-desc{fill:var(--st-text,' + t['--muted'] + ')'), theme);
    assert.ok(
      css.includes(
        '.dg-badge rect{fill:var(--st-fill,' + t['--panel-bg'] + ');stroke:var(--st-stroke,' + t['--border'] + ')'
      ),
      theme
    );
    assert.ok(css.includes('.dg-badge text{fill:var(--st-text,' + t['--fg'] + ')'), theme);
    assert.match(css, /\.dg-shadow>\.dg-box,\.dg-shadow>\.dg-group\{filter:drop-shadow\(/);
    // the variables must come before the outlines that have to win over a custom stroke
    assert.ok(css.indexOf('.dg-styled>.dg-box') < css.indexOf('.dg-focal .dg-box'), theme + ': styled before focal');
    assert.ok(css.indexOf('.dg-styled>.dg-group') < css.indexOf('.dg-focal .dg-box'));
    assert.ok(css.indexOf('.dg-shadow') < css.indexOf('.dg-focal .dg-box'));
    assert.ok(css.indexOf('.dg-box{fill:') < css.indexOf('.dg-styled>.dg-box'), 'after the plain rule it overrides');
    assert.ok(css.indexOf('.dg-title{fill:') < css.indexOf('.dg-styled .dg-title'));
    assert.doesNotMatch(
      css,
      /var\(--(bg|border|fg|muted|panel-bg|accent|danger)\b/,
      'only resolved colours of the theme: the export has no custom property of the page'
    );
  }
  assert.notEqual(cssOf('light'), cssOf('dark'));
  assert.doesNotMatch(
    cssOf('dark').replace(/var\(--st-[a-z-]+,[^)]*\)/g, ''),
    /--st-/,
    'and no --st-* declared in it: the boxes carry them inline'
  );
});

test('an exported document keeps the inline --st-* of the boxes and holds the CSS of the export (driven with a fake DOM)', async () => {
  const { sandbox } = await openFixture();
  // no DOM in the harness: the same fake nodes as the export test of ui-fixes.test.js, with a styled box among the children
  const node = (tag) => ({
    tag,
    attrs: {},
    children: [],
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    removeAttribute(k) {
      delete this.attrs[k];
    },
    insertBefore(child) {
      this.children.unshift(child);
    },
    classList: { remove() {} },
    querySelectorAll: () => [],
    style: {},
    set textContent(v) {
      this.text = v;
    }
  });
  const box = node('g');
  box.attrs = {
    class: 'dg-node dg-styled',
    style: '--st-fill:#faecdd;--st-text:#000000',
    tabindex: '0',
    'data-action': 'goto-element'
  };
  const clone = node('svg');
  clone.querySelectorAll = (selector) => (selector === '[tabindex],[data-action]' ? [box] : []);
  const canvas = { querySelector: () => ({ cloneNode: () => clone }), getAttribute: () => 'mailer' };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  sandbox.document.createElementNS = (ns, tag) => node(tag);
  sandbox.getComputedStyle = () => ({ getPropertyValue: () => '#123456' });
  sandbox.XMLSerializer = class {
    serializeToString() {
      return '<svg/>';
    }
  };
  run(sandbox, "diagramScene = { width: 100, height: 50 }; diagramShownView = 'mailer|overview';");
  const exported = sandbox.diagramExportDocument();
  assert.ok(exported);
  assert.equal(box.attrs.style, '--st-fill:#faecdd;--st-text:#000000', 'the look of a box stays on it');
  assert.equal(box.attrs.tabindex, undefined, 'while what makes it interactive goes');
  assert.equal(box.attrs['data-action'], undefined);
  const style = clone.children.find((child) => child.tag === 'style');
  assert.equal(style.text, sandbox.diagramExportCss());
  assert.ok(style.text.includes('.dg-styled>.dg-box'));
  const source = sandbox.diagramExportDocument.toString();
  assert.equal(
    (source.match(/removeAttribute\('style'\)/g) || []).length,
    1,
    'only the pan transform of the root is removed'
  );
  assert.match(source, /clone\.removeAttribute\('style'\)/);
});

// ---- 12. The CSS text of the page ----

/** The text of the block that opens at `start` (the index of its `{`), braces balanced. */
function blockAt(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error('unbalanced block');
}

test('in the stylesheet the styled rules come before the outlines of focus, selection and focal, which have to win', () => {
  const at = (needle) => {
    const i = CSS.indexOf(needle);
    assert.ok(i > 0, needle + ' is in the stylesheet');
    return i;
  };
  const focal = at('.dg-focal .dg-box');
  for (const needle of [
    '.dg-styled > .dg-box',
    '.dg-styled > .dg-stack',
    '.dg-styled > .dg-group',
    '.dg-shadow > .dg-box'
  ]) {
    assert.ok(at(needle) < focal, needle + ' before .dg-focal .dg-box');
  }
  assert.ok(at('\n  .dg-box {') < at('.dg-styled > .dg-box'), 'the plain look first, the styled one overrides it');
  assert.match(
    CSS,
    /\.dg-focal \.dg-box, \.dg-focal \.dg-group, \.dg-selected \.dg-box, \.dg-selected \.dg-group \{ stroke: var\(--accent\)/,
    'one rule for focal and selected, still the accent'
  );
  assert.ok(at('.dg-styled > .dg-box') < at('.dg-ghost .dg-box'), 'a ghost is still dashed red');
  // the usual look is the fallback of every variable
  assert.match(
    CSS,
    /\.dg-styled > \.dg-box \{ fill: var\(--st-fill, var\(--bg\)\); stroke: var\(--st-stroke, var\(--border\)\);/
  );
  assert.match(CSS, /\.dg-styled > \.dg-group \{ fill: var\(--st-fill, none\);/);
  assert.match(
    CSS,
    /\.dg-styled > \.dg-group \{[^}]*pointer-events: visibleStroke/,
    'a filled group does not swallow the pan of the canvas'
  );
  assert.match(CSS, /\.dg-styled \.dg-title \{ fill: var\(--st-text, var\(--fg\)\)/);
  assert.match(CSS, /\.dg-badge rect \{ fill: var\(--st-fill, var\(--panel-bg\)\)/);
  assert.match(CSS, /\.dg-badge text \{ fill: var\(--st-text, var\(--fg\)\)/);
});

test('the dark theme was given no --st- variable: the text colour is computed, not themed', () => {
  const declared = (block) => Array.from(block.matchAll(/(--[\w-]+)\s*:/g), (m) => m[1]);
  const system = blockAt(CSS, CSS.indexOf('{', CSS.indexOf('prefers-color-scheme: dark')));
  assert.ok(system.includes(':root:not([data-theme="light"])'));
  const forced = CSS.match(/:root\[data-theme="dark"\] \{([^}]*)\}/)[1];
  assert.ok(declared(system).length >= 9 && declared(forced).length >= 9, 'they are the theme blocks');
  assert.deepEqual(
    declared(system).filter((v) => v.startsWith('--st-')),
    []
  );
  assert.deepEqual(
    declared(forced).filter((v) => v.startsWith('--st-')),
    []
  );
  // and no :root block anywhere declares one
  for (const m of CSS.matchAll(/:root[^{]*\{([^}]*)\}/g))
    assert.deepEqual(
      declared(m[1]).filter((v) => v.startsWith('--st-')),
      []
    );
  // no rule is written for a styled box in a theme
  assert.doesNotMatch(CSS, /data-theme[^{]*(dg-styled|dg-badge|stereotype-badge)/);
  assert.doesNotMatch(system, /dg-styled|dg-badge|stereotype-badge/);
});

test('the badge of a tree row has its rule, reading the variables of its style', () => {
  const rule = /\.stereotype-badge \{([^}]*)\}/.exec(CSS);
  assert.ok(rule, '.stereotype-badge exists');
  assert.match(rule[1], /var\(--st-fill/);
  assert.match(rule[1], /var\(--st-stroke/);
  assert.match(rule[1], /var\(--st-text/);
  assert.match(rule[1], /text-overflow: ellipsis/);
  assert.ok(CSS.indexOf('.stereotype-badge {') > CSS.indexOf('.tree-node-kind {'), 'next to the kind of the row');
  assert.match(CSS, /\.map-scope-row \.stereotype-badge/);
  assert.match(CSS, /\.dg-legend-stereotypes \{/);
});

// ---- 13. The cache ----

test('the cache key of a drawing holds the styles, so that a workspace reloaded with other styles is not drawn with the old look', async () => {
  const { sandbox, state } = await openFixture();
  assert.match(
    sandbox.mountDiagramIfNeeded.toString(),
    /diagramCache\.key === key/,
    'the page compares the key it built'
  );
  const recipe = {
    isMap: true,
    reference: '',
    viewpoint: 'map',
    facet: null,
    mapState: { opened: [], pinned: [], hidden: [] },
    shows: {},
    hideUnlinked: false
  };
  const key = () => sandbox.diagramCacheKey(recipe, null, 'map');
  state.workspace.styles = userStyles();
  const styled = key();
  assert.equal(key(), styled, 'the same styles, the same key');
  state.workspace.styles = {};
  assert.notEqual(key(), styled, 'other styles, another key');
  state.workspace.styles = undefined;
  assert.equal(typeof key(), 'string', 'defined for a workspace with none');
  assert.notEqual(key(), styled);
});

// ---- 14. The fold button of a styled box ----

test('the chevron of a styled box is drawn in the colour of its text, so that it reads on the fill in the dark theme', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = {
    'by-tags': { dark: { 'background-color': '#1b2a41' }, light: { 'background-color': '#DAF2E6' } }
  };
  state.index.application.get('shop').tags = { 'rendering-stereotypes': 'light' };
  state.index.application.get('customer').tags = { 'rendering-stereotypes': 'dark' };
  const result = kernel.compute(sandbox.buildKernelInput('map', '', { opened: [], pinned: [], hidden: [] }).input);
  const svg = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '', { map: true }).html;
  const at = svg.indexOf('data-action="toggle-fold"');
  assert.ok(at > 0, 'a styled box that can be opened has its button');
  const tag = svg.slice(svg.lastIndexOf('<g class="dg-fold"', at), svg.indexOf('<title>', at));
  assert.match(tag, /style="--st-text:#000000"/, 'black on the pale fill');
  assert.match(CSS, /\.dg-fold-glyph \{[^}]*stroke: var\(--st-text, var\(--fg\)\)/);
  // an unstyled box keeps the plain button
  state.workspace.styles = {};
  const plainSvg = sandbox.renderDiagramSvg(
    fakeLayout(
      sandbox.buildElkGraph(
        kernel.compute(sandbox.buildKernelInput('map', '', { opened: [], pinned: [], hidden: [] }).input)
      )
    ),
    result,
    '',
    { map: true }
  ).html;
  assert.ok(!plainSvg.includes('class="dg-fold" style='), 'no variable without a style');
});

// ---- 15. The title of a box with no fill, drawn on the fill of the box around it ----

test('a compound box with no fill of its own, inside one that has, reads its title against that fill, not against the theme', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = {
    'by-tags': { pale: { 'background-color': '#DAF2E6' }, night: { 'background-color': '#1b2a41' } }
  };
  state.index.application.get('shop').tags = { 'rendering-stereotypes': 'pale' };
  const classOf = (svg, id) => attributeOf(openingTag(nodeOf(svg, id)), 'class').split(' ');
  const styleOf = (svg, id) => attributeOf(openingTag(nodeOf(svg, id)), 'style') || '';
  let svg = draw(sandbox, kernel, 'deep', 'shop').svg;
  assert.ok(!classOf(svg, 'shop').includes('dg-over-fill'), 'the box that has the fill reads its own text (--st-text)');
  assert.ok(classOf(svg, 'shop.catalog').includes('dg-over-fill'), 'an unstyled box inside it');
  assert.match(styleOf(svg, 'shop.catalog'), /--ov-text:#000000/, 'black on the pale fill, in the dark theme too');
  assert.match(styleOf(svg, 'shop.catalog.service'), /--ov-text:#000000/, 'and the one inside that, two boxes down');
  assert.ok(!classOf(svg, 'shop.catalog.db').includes('dg-over-fill'), 'a box without children keeps its own fill');
  // the same rule for the dark fill (the light theme would otherwise write its dark text on it)
  state.workspace.styles['by-tags'].pale = { 'background-color': '#1b2a41' };
  svg = draw(sandbox, kernel, 'deep', 'shop').svg;
  assert.match(styleOf(svg, 'shop.catalog'), /--ov-text:#ffffff/);
  // a box in between that has a fill of its own is the one behind its children
  state.workspace.styles['by-tags'].pale = { 'background-color': '#DAF2E6' };
  state.index.application.get('shop.catalog').tags = { 'rendering-stereotypes': 'night' };
  svg = draw(sandbox, kernel, 'deep', 'shop').svg;
  assert.ok(!classOf(svg, 'shop.catalog').includes('dg-over-fill'));
  assert.match(
    styleOf(svg, 'shop.catalog.service'),
    /--ov-text:#ffffff/,
    'white on the dark fill of shop.catalog, not black on the pale one of shop'
  );
  // no fill anywhere around: the theme's own text, byte for byte what it was
  state.workspace.styles = {};
  svg = draw(sandbox, kernel, 'deep', 'shop').svg;
  assert.doesNotMatch(svg, /dg-over-fill|--ov-text/);
});

test('the title of a box on a fill is drawn from --ov-text on the page and in the export, after the rules it must win over', async () => {
  const { sandbox } = await openFixture();
  assert.match(CSS, /\.dg-over-fill \.dg-title, \.dg-over-fill \.dg-sub \{ fill: var\(--ov-text\); \}/);
  assert.ok(
    CSS.indexOf('.dg-over-fill .dg-title') > CSS.indexOf('.dg-styled .dg-title'),
    'after the styled rule of the same specificity'
  );
  assert.ok(CSS.indexOf('.dg-over-fill .dg-title') > CSS.indexOf('.dg-title { fill: var(--fg)'));
  sandbox.getComputedStyle = () => ({ getPropertyValue: () => ' #123456 ' });
  const css = sandbox.diagramExportCss();
  assert.ok(css.includes('.dg-over-fill .dg-title,.dg-over-fill .dg-sub{fill:var(--ov-text)}'));
  assert.ok(css.indexOf('.dg-over-fill') > css.indexOf('.dg-styled .dg-title'));
});

// ---- 13. The outline derived from a fill (run 0032) ----

/** The channels of a CSS colour as [r, g, b]. */
const channelsOf = (text) => [1, 3, 5].map((i) => parseInt(text.slice(i, i + 2), 16));

test('a fill and no line-color: the outline is the fill, darker, same hue, as opaque as a chosen one; the fill is untouched', async () => {
  const { sandbox } = await openFixture();
  const look = (style) => plain(sandbox.styleLookOf(style));
  const factor = run(sandbox, 'STYLE_OUTLINE_DARKEN');
  assert.equal(factor, 0.6, 'the value chosen by looking at the page in both themes');
  const vars = look({ 'background-color': 'lightgray' }).vars;
  assert.equal(vars['--st-fill'], '#d3d3d3', "the fill is the author's own");
  assert.equal(vars['--st-stroke'], '#7f7f7f');
  assert.equal(
    vars['--st-stroke-opacity'],
    '1',
    'also for a compound box: its faded fallback is for a box with no colour'
  );
  // same hue: every channel scaled by the same factor, so the proportions of the colour are kept
  const mint = look({ 'background-color': '#DAF2E6' }).vars;
  assert.equal(mint['--st-fill'], '#daf2e6');
  assert.deepEqual(
    channelsOf(mint['--st-stroke']),
    channelsOf('#daf2e6').map((v) => Math.round(v * factor))
  );
  assert.ok(
    channelsOf(mint['--st-stroke']).every((v, i) => v < channelsOf('#daf2e6')[i]),
    'darker'
  );
  // the text is still computed from the fill, never from the outline
  assert.equal(vars['--st-text'], '#000000');
});

test('an explicit line-color always wins, and the fill is untouched; no fill, no outline is derived', async () => {
  const { sandbox } = await openFixture();
  const look = (style) => plain(sandbox.styleLookOf(style));
  const own = look({ 'background-color': 'lightgray', 'line-color': '#2A6A4B' }).vars;
  assert.equal(own['--st-stroke'], '#2a6a4b');
  assert.equal(own['--st-fill'], '#d3d3d3');
  assert.equal(
    look({ 'background-color': '#DAF2E6', 'line-color': '#DAF2E6' }).vars['--st-stroke'],
    '#daf2e6',
    'even one that is the colour of the fill: the author said so'
  );
  assert.deepEqual(
    look({ 'line-color': 'navy' }).vars,
    { '--st-stroke': '#000080', '--st-stroke-opacity': '1' },
    'a line alone is what it was'
  );
  // a fill that is `transparent` is no fill: the box keeps the colours of the theme
  assert.deepEqual(look({ 'background-color': 'transparent' }).vars, { '--st-fill': 'transparent' });
  // an unreadable colour is ignored, as before: no fill, no derived line
  assert.deepEqual(look({ 'background-color': 'not-a-colour' }).vars, {});
  assert.deepEqual(look({ 'line-thickness': 3 }).vars, { '--st-width': '3px' });
  // the other properties are as they were
  const full = look({ 'background-color': 'lightgray', 'line-thickness': 3, 'line-style': 4 }).vars;
  assert.equal(full['--st-width'], '3px');
  assert.equal(full['--st-dash'], '4 4');
});

test("every CSS colour name gets an outline that can be told from its fill, and the outline is never the theme's border", async () => {
  const { sandbox } = await openFixture();
  const names = run(sandbox, "CSS_COLOR_TABLE.split(' ').filter(Boolean).map((e) => e.slice(0, e.indexOf(':')))");
  assert.ok(names.length >= 140);
  for (const name of names) {
    const vars = plain(sandbox.styleLookOf({ 'background-color': name }).vars);
    const fill = sandbox.parseCssColor(vars['--st-fill']);
    const stroke = sandbox.parseCssColor(vars['--st-stroke']);
    assert.ok(stroke, name + ' has an outline');
    assert.ok(
      sandbox.contrastRatio(fill, stroke) >= 1.5,
      name + ': the outline stands out of the fill: ' + sandbox.contrastRatio(fill, stroke)
    );
  }
});

test('a fill too dark to be darkened is outlined lighter: a black box inside a black box is still told apart', async () => {
  const { sandbox } = await openFixture();
  const stroke = (color) => plain(sandbox.styleLookOf({ 'background-color': color }).vars)['--st-stroke'];
  assert.equal(stroke('black'), '#666666');
  const navy = channelsOf(stroke('#1b2a41'));
  const navyFill = channelsOf('#1b2a41');
  assert.ok(
    navy.every((v, i) => v > navyFill[i]),
    'lighter, not darker'
  );
  assert.ok(sandbox.contrastRatio(sandbox.parseCssColor('#1b2a41'), sandbox.parseCssColor(stroke('#1b2a41'))) >= 3);
  assert.equal(stroke('#808080'), '#4d4d4d', 'a mid fill is darkened');
});

test('with several stereotypes the outline is derived from the merged style: a later line-color wins, a later fill is outlined', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = userStyles();
  state.workspace.styles['by-tags'].dark = { 'background-color': '#1b2a41' };
  const vars = (names) => plain(sandbox.stereotypeLookOf(names).vars);
  assert.equal(vars(['external'])['--st-stroke'], '#7f7f7f');
  assert.equal(vars(['external', 'changed'])['--st-stroke'], '#a2501c', "changed has a line: it is the author's");
  assert.equal(
    vars(['changed', 'external'])['--st-stroke'],
    '#a2501c',
    'the line of changed still wins, as nothing else says one: external has none to override it'
  );
  assert.equal(vars(['changed', 'external'])['--st-fill'], '#d3d3d3', "and the fill is the later one's");
  assert.ok(channelsOf(vars(['changed', 'dark'])['--st-fill']).join() === channelsOf('#1b2a41').join());
  assert.equal(vars(['changed', 'dark'])['--st-stroke'], '#a2501c');
});

test('a box inside a box of the same fill: both carry an outline derived from that fill, not the border of the theme', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = { 'by-tags': { external: { 'background-color': 'lightgray' } } };
  state.index.application.get('shop').tags = { 'rendering-stereotypes': 'external' };
  state.index.application.get('shop.catalog').tags = { 'rendering-stereotypes': 'external' };
  const { svg } = draw(sandbox, kernel, 'deep', 'shop');
  for (const id of ['shop', 'shop.catalog']) {
    const tag = openingTag(nodeOf(svg, id));
    assert.ok(attributeOf(tag, 'class').split(' ').includes('dg-styled'), id);
    const style = attributeOf(tag, 'style');
    assert.match(style, /--st-fill:#d3d3d3/, id);
    assert.match(style, /--st-stroke:#7f7f7f/, id + ': ' + style);
    assert.match(style, /--st-stroke-opacity:1/, id + ': a compound box is outlined as firmly as a leaf');
  }
  // the leaf (no children) inside them
  assert.equal(
    attributeOf(openingTag(nodeOf(svg, 'shop.catalog.db')), 'style'),
    null,
    "an unstyled leaf has no variable: the theme's look"
  );
  state.index.application.get('shop.catalog.db').tags = { 'rendering-stereotypes': 'external' };
  const again = draw(sandbox, kernel, 'deep', 'shop').svg;
  assert.match(attributeOf(openingTag(nodeOf(again, 'shop.catalog.db')), 'style'), /--st-stroke:#7f7f7f/);
});

test('a box with no styled stereotype, or a style with no fill, is drawn with no outline variable: byte for byte what it was', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = { 'by-tags': { thick: { 'line-thickness': 3 } } };
  state.index.application.get('shop').tags = { 'rendering-stereotypes': 'thick' };
  const { svg } = draw(sandbox, kernel, 'deep', 'shop');
  assert.equal(attributeOf(openingTag(nodeOf(svg, 'shop')), 'style'), '--st-width:3px');
  const plainSvg = draw(sandbox, kernel, 'deep', 'shop.catalog').svg;
  assert.equal(attributeOf(openingTag(nodeOf(plainSvg, 'shop.catalog.db')), 'style'), null);
  assert.doesNotMatch(
    plainSvg.replace(/<g class="dg-badge"[^>]*>/g, ''),
    /--st-stroke/,
    'only the pill of a styled stereotype says initial'
  );
});

test('the pill of a stereotype is outlined from its own fill unless its style has a line of its own', async () => {
  const { sandbox, state } = await openFixture();
  state.workspace.styles = userStyles();
  assert.equal(plain(sandbox.stereotypeBadgeVarsOf('external'))['--st-stroke'], '#7f7f7f');
  assert.equal(plain(sandbox.stereotypeBadgeVarsOf('changed'))['--st-stroke'], '#a2501c');
  state.workspace.styles['by-tags'].line = { 'line-color': 'navy' };
  const only = plain(sandbox.stereotypeBadgeVarsOf('line'));
  assert.equal(only['--st-stroke'], '#000080');
  assert.equal(only['--st-fill'], 'initial', 'a line alone: no fill to derive from, none made up');
  state.workspace.styles['by-tags'].empty = {};
  assert.equal(plain(sandbox.stereotypeBadgeVarsOf('empty'))['--st-stroke'], 'initial');
});

test('the derived outline is a variable of the box: the page and the export read it the same way, and the focal and selected outlines still win', async () => {
  const { sandbox } = await openFixture();
  // the page
  assert.match(CSS, /\.dg-styled > \.dg-box \{[^}]*stroke: var\(--st-stroke, var\(--border\)\)/);
  assert.match(
    CSS,
    /\.dg-styled > \.dg-group \{[^}]*stroke: var\(--st-stroke, var\(--muted\)\); stroke-opacity: var\(--st-stroke-opacity, 0\.55\)/,
    'the faded outline is the fallback of a compound box with no colour'
  );
  assert.ok(CSS.indexOf('.dg-styled > .dg-group') < CSS.indexOf('.dg-focal .dg-box'));
  assert.match(
    CSS,
    /\.dg-focal \.dg-box, \.dg-focal \.dg-group, \.dg-selected \.dg-box, \.dg-selected \.dg-group \{ stroke: var\(--accent\)/
  );
  // the export: the same rules (it has no stylesheet of the page), the variable inline on the box
  sandbox.getComputedStyle = () => ({ getPropertyValue: () => ' #123456 ' });
  const css = sandbox.diagramExportCss();
  assert.ok(
    css.includes(
      '.dg-styled>.dg-group{fill:var(--st-fill,none);stroke:var(--st-stroke,#123456);stroke-opacity:var(--st-stroke-opacity,.55);'
    )
  );
  assert.ok(css.includes('.dg-styled>.dg-box{fill:var(--st-fill,#123456);stroke:var(--st-stroke,#123456);'));
  assert.ok(
    css.indexOf('.dg-styled>.dg-group') < css.indexOf('.dg-focal .dg-box'),
    'the focal outline wins in the export too'
  );
});

test('the drawing that the export is made from holds the derived outline inline on each box', async () => {
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = { 'by-tags': { external: { 'background-color': 'lightgray' } } };
  state.index.application.get('shop').tags = { 'rendering-stereotypes': 'external' };
  state.index.application.get('shop.catalog').tags = { 'rendering-stereotypes': 'external' };
  const { svg } = draw(sandbox, kernel, 'deep', 'shop');
  // `diagramExportDocument` keeps the style attribute of every box (the test above); the markup it clones has the outline in it
  assert.equal(
    (svg.match(/--st-stroke:#7f7f7f;--st-stroke-opacity:1/g) || []).length,
    4,
    'two boxes and the pill of each'
  );
});
