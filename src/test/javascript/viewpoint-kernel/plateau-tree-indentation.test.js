'use strict';
// Wave 025, run 0189 (#175): the indentation of a plateau grows with its depth for a chain of any length, on the page Plateaus and in the two lists of the band; at 360 px the step is
// half as wide. The markup and the CSS text are tested, not pixels. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { layeredFiles } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const CHAIN = 12;
const OPTION = /<option value="(?:plateau:)?(?:baseline|step\d+)"[^>]*>(\u2003*)[^<]*<\/option>/g;

/** A chain of plateaus over baseline, each overriding the one before (invented names). */
async function openChain(n) {
  const plateaus = [];
  const files = {};
  for (let i = 1; i <= n; i++) {
    const id = 'step' + i;
    plateaus.push({
      id,
      name: 'Step ' + i,
      horizon: 2026 + Math.floor((i - 1) / 4) + '-Q' + (((i - 1) % 4) + 1),
      override: i === 1 ? undefined : 'step' + (i - 1),
      path: 'plateaus/' + id
    });
    files['plateaus/' + id + '/s' + i + '.yaml'] =
      'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "s' +
      i +
      '"\n  name: "Service ' +
      i +
      '"\n';
  }
  const mem = memFolder(layeredFiles(plateaus, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'chain' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return sandbox;
}

const expected = Array.from({ length: CHAIN + 1 }, (_, i) => i);

/** The body of the rule of `selector` found in `css` (first match), or ''. */
const bodyOf = (css, selector) => {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    if (
      m[1]
        .split(',')
        .map((x) => x.trim())
        .includes(selector)
    )
      return m[2];
  return '';
};

const narrow = () => {
  const at = CSS.indexOf('@media (max-width: 40rem) {');
  assert.ok(at >= 0, 'the query for the narrow window exists');
  let depth = 0;
  for (let i = CSS.indexOf('{', at); i < CSS.length; i++) {
    if (CSS[i] === '{') depth++;
    if (CSS[i] === '}' && --depth === 0) return { inside: CSS.slice(CSS.indexOf('{', at) + 1, i), at };
  }
  throw new Error('the query is not closed');
};

test('the page Plateaus indents each plateau of a chain of twelve by its depth, with no cap', async () => {
  const sandbox = await openChain(CHAIN);
  sandbox.setPerspective('plateaus');
  const center = sandbox.renderActivePerspectiveHtml().center;
  const depths = Array.from(
    center.matchAll(/<li class="timeline-item[^"]*" data-plateau="[^"]+" style="--depth:(\d+)"/g),
    (m) => Number(m[1])
  );
  assert.deepEqual(depths, expected, 'the --depth of the cards is the depth of the plateau, 0 to ' + CHAIN);
});

test('both lists of the band indent each plateau of a chain of twelve by its depth with one em space per level', async () => {
  const sandbox = await openChain(CHAIN);
  sandbox.setPerspective('plateaus');
  const html = sandbox.renderPlateauBandHtml();
  for (const id of ['band-plateau', 'band-compare']) {
    const at = html.indexOf('<select id="' + id + '"');
    assert.ok(at >= 0, id + ' is drawn');
    const block = html.slice(at, html.indexOf('</select>', at));
    const spaces = Array.from(block.matchAll(OPTION), (m) => m[1].length);
    assert.deepEqual(spaces, expected, id + ': the em spaces before the names are the depths, 0 to ' + CHAIN);
  }
});

test('the style sheet has the uncapped step and a half step in the one query for the narrow window', () => {
  const base = bodyOf(CSS.slice(0, narrow().at), '.timeline-item');
  assert.match(base, /margin-left:\s*calc\(var\(--depth, 0\) \* 1rem\)/, 'one rem per level outside any query');
  assert.doesNotMatch(base, /min\(|clamp\(/, 'no cap in the base rule');
  assert.match(
    bodyOf(narrow().inside, '.timeline-item'),
    /margin-left:\s*calc\(var\(--depth, 0\) \* 0\.5rem\)/,
    'half a rem per level under 40rem'
  );
});
