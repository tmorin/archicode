'use strict';
// #69 (wave 013, run 0066): with four plateaus of ordinary names the plateau buttons are 901 px wide on their own and the header needed about 1275 px; below that the page
// scrolled sideways and `Compare to` was off screen. The rule that fixes it is that the plateau switch is never wider than the bar and that its buttons, and Compare to, wrap
// inside their own groups. The harness has no layout engine, so this is the rule, read from the stylesheet the browser is given and resolved the way the cascade does for
// the elements of the header, plus the markup on the Brightcart folders (four plateaus, names as long as the fixture's). What a window shows at 800 px is a measure in a
// browser (the run says whether it was made). Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const FOLDERS = path.resolve(__dirname, '../../resources/brightcart/folders');

/** The rules of the top level of the stylesheet whose selectors are class names joined by descendant combinators (the ones the header uses), in source order. */
function simpleRules() {
  const rules = [];
  for (const m of CSS.matchAll(/(?<=^|\})\s*([^{}@]+)\{([^{}]*)\}/g)) {
    const declarations = Object.fromEntries(m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const i = d.indexOf(':');
      return [d.slice(0, i).trim(), d.slice(i + 1).replace('!important', '').trim()];
    }));
    for (const selector of m[1].split(',').map((x) => x.trim())) {
      if (/^(\.[\w-]+)(\s+\.[\w-]+)*$/.test(selector)) rules.push({ chain: selector.split(/\s+/).map((c) => c.slice(1)), declarations, index: rules.length });
    }
  }
  return rules;
}

/** The declarations that apply to an element of the header: `chain` lists its ancestors and itself, each as the classes it carries. Specificity (classes), then source order. */
function computed(chain) {
  const matching = simpleRules().filter((rule) => {
    const classes = rule.chain.map((c) => c);
    let at = chain.length - 1;
    if (!chain[at].includes(classes[classes.length - 1])) return false;
    for (let i = classes.length - 2; i >= 0; i--) {
      at--;
      while (at >= 0 && !chain[at].includes(classes[i])) at--;
      if (at < 0) return false;
    }
    return true;
  }).sort((a, b) => a.chain.length - b.chain.length || a.index - b.index);
  return Object.assign({}, ...matching.map((rule) => rule.declarations));
}

const HEADER = ['top-panel'];
const SWITCH = [HEADER, ['plateau-switch']];
const TABS = [HEADER, ['plateau-switch'], ['plateau-tabs', 'button-group']];
const COMPARE = [HEADER, ['plateau-switch'], ['compare-control']];

async function brightcart() {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(FOLDERS);
  state.folder = { handle, name: 'folders' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  return { sandbox, state };
}

test('the plateau switch is never wider than the bar: it may shrink, and it is capped at the width of the bar', () => {
  const style = computed(SWITCH);
  assert.notEqual(style['flex-shrink'], '0', 'a switch that cannot shrink stays as wide as its buttons');
  assert.equal(style['max-width'], '100%');
  assert.equal(style['min-width'], '0');
  assert.equal(style['flex-wrap'], 'wrap', 'Compare to goes under the buttons when there is no room beside them');
});

test('the plateau buttons wrap inside their own group, which is capped at the width of the switch', () => {
  const style = computed(TABS);
  assert.equal(style['flex-wrap'], 'wrap');
  assert.equal(style['max-width'], '100%');
  assert.equal(style['min-width'], '0');
  assert.match(style['display'], /flex/, 'the group is still a row of buttons');
});

test('Compare to wraps inside its own group, which is capped at the width of the switch', () => {
  const style = computed(COMPARE);
  assert.equal(style['flex-wrap'], 'wrap');
  assert.equal(style['max-width'], '100%');
  assert.equal(style['min-width'], '0');
});

test('the perspective tabs still keep their size (the plateau switch was the only one that had to give way)', () => {
  assert.equal(computed([HEADER, ['perspective-tabs', 'button-group']])['flex-shrink'], '0');
});

test('on the Brightcart folders the four plateaus and Compare to are inside the switch, the buttons in the group that wraps', async () => {
  const { sandbox, state } = await brightcart();
  assert.equal(state.plateaus.length, 4);
  const html = sandbox.renderPlateauTabsHtml();
  assert.ok(html.startsWith('<span class="plateau-switch">'));
  const group = html.match(/<span class="plateau-tabs button-group"[^>]*>([\s\S]*?)<\/span><\/span>(?!<span class="plateau-horizon)/);
  assert.ok(group, 'the group of the plateaus');
  assert.equal((group[1].match(/<button\b/g) || []).length, 4, 'the four plateaus are the buttons of the group');
  assert.ok(html.indexOf('class="plateau-tabs') < html.indexOf('class="compare-control"'), 'Compare to follows the buttons, inside the switch');
  const widest = Math.max(...state.plateaus.map((p) => (p.name || p.id).length));
  assert.ok(widest >= 30, 'the names are as long as the issue says (a plateau of ' + widest + ' characters)');
});
