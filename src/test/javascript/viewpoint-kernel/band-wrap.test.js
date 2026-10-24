'use strict';
// #69 (wave 013, run 0066) and wave 014, run 0084: with four plateaus of ordinary names the plateau buttons were 901 px wide on their own and the header needed about 1275 px; below that
// the page scrolled sideways. The header no longer holds the plateaus (the band under it does, and is the one way to choose and compare them), and the rule that keeps it from
// widening the page is that the band is never wider than the window and that what it holds wraps inside its own groups. The harness has no layout engine, so this is the rule, read
// from the stylesheet the browser is given and resolved the way the cascade does for the elements of the band, plus the markup on a workspace of four plateaus with the long names of
// Brightcart's. What a window shows at 360 or 800 px is a measure in a browser (the run says whether it was made). Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { layeredFiles, openLayered } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');

/** Four plateaus, siblings over `baseline`, with the long names of the Brightcart fixture (see layered-folders.js). */
const NAMES = [
  'Monolith kept as it is today',
  'Buy the commerce platform and keep the back office',
  'Build commerce services in house',
  'Open a marketplace of sellers and partners'
];
const IDS = ['saas', 'inhouse', 'marketplace', 'monolith'];
const SHOP = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n';
const PLATEAUS = IDS.map((id, i) => ({ id, name: NAMES[i], path: 'plateaus/' + id }));
const LONG_NAMES = layeredFiles(
  PLATEAUS,
  Object.fromEntries(IDS.map((id) => ['plateaus/' + id + '/app.shop.yaml', SHOP]))
);

/** The rules of the top level of the stylesheet whose selectors are class names joined by descendant combinators (the ones the header uses), in source order. */
function simpleRules() {
  const rules = [];
  for (const m of CSS.matchAll(/(?<=^|\})\s*([^{}@]+)\{([^{}]*)\}/g)) {
    const declarations = Object.fromEntries(
      m[2]
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => {
          const i = d.indexOf(':');
          return [
            d.slice(0, i).trim(),
            d
              .slice(i + 1)
              .replace('!important', '')
              .trim()
          ];
        })
    );
    for (const selector of m[1].split(',').map((x) => x.trim())) {
      if (/^(\.[\w-]+)(\s+\.[\w-]+)*$/.test(selector))
        rules.push({ chain: selector.split(/\s+/).map((c) => c.slice(1)), declarations, index: rules.length });
    }
  }
  return rules;
}

/** The declarations that apply to an element of the header: `chain` lists its ancestors and itself, each as the classes it carries. Specificity (classes), then source order. */
function computed(chain) {
  const matching = simpleRules()
    .filter((rule) => {
      const classes = rule.chain.map((c) => c);
      let at = chain.length - 1;
      if (!chain[at].includes(classes[classes.length - 1])) return false;
      for (let i = classes.length - 2; i >= 0; i--) {
        at--;
        while (at >= 0 && !chain[at].includes(classes[i])) at--;
        if (at < 0) return false;
      }
      return true;
    })
    .sort((a, b) => a.chain.length - b.chain.length || a.index - b.index);
  return Object.assign({}, ...matching.map((rule) => rule.declarations));
}

/** The declarations of the rules whose selector is exactly `selector` (a descendant selector of classes and an element name), merged in source order. */
function simpleRulesFor(selector) {
  const out = {};
  for (const m of CSS.matchAll(/(?<=^|\})\s*([^{}@]+)\{([^{}]*)\}/g)) {
    if (
      !m[1]
        .split(',')
        .map((x) => x.trim())
        .includes(selector)
    )
      continue;
    for (const d of m[2]
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)) {
      const i = d.indexOf(':');
      out[d.slice(0, i).trim()] = d
        .slice(i + 1)
        .replace('!important', '')
        .trim();
    }
  }
  return out;
}

const HEADER = ['top-panel'];
const BAND = [['plateau-band']];
const FIELD = [['plateau-band'], ['band-field']];

test('the band is never wider than the window: it wraps, it may shrink, and it is capped at the width of the page', () => {
  const style = computed(BAND);
  assert.equal(style['flex-wrap'], 'wrap', 'what does not fit beside the tree goes under it');
  assert.equal(style['max-width'], '100%');
  assert.equal(style['min-width'], '0');
  assert.match(style['display'], /flex/);
});

test('what the band holds takes what is left of the row and no more, so that it wraps under the width of the window: a list may shrink to nothing, and says it with an ellipsis', () => {
  const field = computed(FIELD);
  assert.match(field['display'], /flex/);
  assert.equal(field['min-width'], '0', 'a field may be narrower than its content');
  assert.match(
    field['flex'],
    /^1 1 /,
    'it grows and shrinks from a basis, so a row holds the two lists when the window is wide and one under the other when it is not'
  );
  assert.match(field['max-width'], /rem$/, 'and a very wide window does not stretch it');
  const rules = simpleRulesFor('.band-field select');
  assert.equal(rules['min-width'], '0');
  assert.equal(rules['width'], '100%');
  assert.equal(rules['text-overflow'], 'ellipsis');
});

test('the perspective tabs keep their size, and the header holds neither the plateaus nor a list to compare to', async () => {
  assert.equal(computed([HEADER, ['perspective-tabs', 'button-group']])['flex-shrink'], '0');
  const { sandbox, state } = await openLayered(createApp, memFolder, LONG_NAMES, { drawn: 'inhouse' });
  assert.equal(state.fatalError, null);
  const header = sandbox.renderTopPanelHtml();
  assert.doesNotMatch(
    header,
    /plateau-switch|plateau-tabs|compare-control|id="compare-to"|data-action="set-plateau"|reload-baseline/
  );
  assert.match(header, /class="perspective-tabs/);
});

test('on four plateaus with long names the band is two lists, the plateau drawn in one and what it is compared with in the other, and no tree, no toggle and no write', async () => {
  const { sandbox } = await openLayered(createApp, memFolder, LONG_NAMES, { drawn: 'inhouse' });
  const band = sandbox.renderPlateauBandHtml();
  assert.ok(band.startsWith('<nav class="plateau-band col-span-3" id="plateau-band" aria-label="Plateaus">'));
  assert.equal((band.match(/<select /g) || []).length, 2, 'the plateau, and the comparison');
  const plateau = band.slice(band.indexOf('id="band-plateau"'), band.indexOf('</select>'));
  for (const id of ['baseline'].concat(IDS)) assert.match(plateau, new RegExp('<option value="' + id + '"'), id);
  assert.match(plateau, /<option value="inhouse" selected>/, 'the plateau drawn is the one selected');
  for (const gone of [
    'band-tree',
    'band-node',
    'band-draw',
    'data-action="compare-past"',
    'data-action="compare-future"',
    'data-action="compare-plateau"',
    'band-writing',
    'band-status',
    'set-changes-only'
  ]) {
    assert.ok(!band.includes(gone), gone + ' is not on the band');
  }
  assert.ok(Math.max(...NAMES.map((n) => n.length)) >= 30, 'the names are as long as the issue says');
});
