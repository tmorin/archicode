'use strict';
// The Reading view of a path of plateaus on the page Plateaus (presentation/plateau-matrix-page.js): the table of the layered Brightcart for the path baseline, inhouse, marketplace
// is the one of the oracle src/test/resources/brightcart/matrix-cases.json (read here, never edited), read through the page's own markup; the list of the plateaus is what it was;
// the pending kernel, a pair that cannot be compared, a workspace with no plateau to read, blocked layers and a stale path each have their state; a click on a cell draws the pair of
// its column and puts the Changes panel on the element.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const ROOT = path.resolve(__dirname, '../../../..');
const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const CASES = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../resources/brightcart/matrix-cases.json'), 'utf8')
);
const CASE = CASES.cases.find((c) => c.id === 'baseline-inhouse-marketplace');
const run = (sandbox, code) => vm.runInContext(code, sandbox);

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

const LAYERED_FILES = walk(LAYERED, LAYERED, {});

async function openIn(files, options) {
  const mem = memFolder(Object.assign({}, files));
  const sandbox = createApp(options || {});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  if (!options || options.kernel !== false) await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  sandbox.render = () => {}; // the harness has no layout engine; the page Plateaus mounts no diagram, its markup is read from the function
  return { sandbox, state };
}

const openLayered = () => openIn(LAYERED_FILES);

const reading = (sandbox, id, all) => run(sandbox, 'plateauReading = ' + JSON.stringify({ path: id, all: !!all }));
const goToPlateaus = (sandbox) => run(sandbox, "currentPerspective = 'plateaus'");
const text = (html) => html.replace(/<[^>]*>/g, '');

/** The rows of the table as the page writes them: `{ layer, reference, cells: [word...], span, from: [[ref...]...] }`; the Span is the last cell when the head has it. */
function tableOf(html) {
  const head = html.match(/<thead>[\s\S]*?<\/thead>/);
  assert.ok(head, 'a table is drawn');
  const hasSpan = /<th scope="col" class="matrix-span">Span<\/th>/.test(head[0]);
  const columns = (head[0].match(/<th scope="col"/g) || []).length - 1 - (hasSpan ? 1 : 0);
  const rows = [];
  for (const group of html.matchAll(/<tbody data-layer="([^"]*)">([\s\S]*?)<\/tbody>/g)) {
    for (const row of group[2].matchAll(/<tr class="matrix-row">([\s\S]*?)<\/tr>/g)) {
      const reference = row[1].match(/<th scope="row"[^>]*><code>([^<]*)<\/code>/)[1];
      const tds = Array.from(row[1].matchAll(/<td class="([^"]*)">([\s\S]*?)<\/td>/g));
      const words = tds.map((td) => {
        const word = td[2].match(/<span class="matrix-word">([^<]*)<\/span>/);
        return word ? word[1] : null;
      });
      const from = tds.map((td) => Array.from(td[2].matchAll(/<code>([^<]*)<\/code>/g), (m) => m[1]));
      rows.push({
        layer: group[1],
        reference,
        cells: words.slice(0, columns),
        span: hasSpan ? words[columns] : null,
        from: from.slice(0, columns)
      });
    }
  }
  return { rows, columns, hasSpan };
}

test('the table of the path baseline, inhouse, marketplace is the one of the oracle, the Span included', async () => {
  const { sandbox } = await openLayered();
  assert.deepEqual(Array.from(sandbox.plateauMatrixPathOf('marketplace')), CASE.args);
  reading(sandbox, 'marketplace');
  const page = sandbox.renderPlateausPageHtml();
  assert.match(page, /<h3>Reading <code>baseline, inhouse, marketplace<\/code><\/h3>/);
  const table = tableOf(page);
  assert.equal(table.columns, 3);
  assert.ok(table.hasSpan);
  assert.equal(table.rows.length, CASE.rows, 'the rows of the file, the unchanged lineages left out');
  CASE.expectRows.forEach((want, i) => {
    const got = table.rows[i];
    const at = 'row ' + i + ' ' + want.reference;
    assert.equal(got.layer, want.layer, at);
    assert.equal(got.reference, want.reference, at);
    assert.deepEqual(got.cells, want.cells, at);
    assert.equal(got.span, want.span, at + ': span');
    if (want.from) assert.deepEqual(got.from, want.from, at + ': from');
  });
  const spanWords = (word) => table.rows.filter((row) => row.span === word).length;
  assert.equal(spanWords('moved'), 11);
  assert.equal(spanWords('split'), 2);
  assert.equal(spanWords('merged'), 1);
  assert.equal(spanWords('new'), CASE.span.counts.elements.new);
  assert.match(
    text(page),
    new RegExp(
      CASE.rows + ' changes in ' + (CASE.rows + CASE.unchanged) + ' lineages · ' + CASE.unchanged + ' unchanged'
    )
  );
});

test('a cell says its state with a word and a glyph, and a change is a button that names the element, the state and the pair', async () => {
  const { sandbox } = await openLayered();
  reading(sandbox, 'marketplace');
  const page = sandbox.renderPlateausPageHtml();
  const moved = CASE.expectRows.find((row) => row.cells[2] === 'moved');
  const cell = new RegExp(
    '<button type="button" class="matrix-cell-button" data-action="matrix-cell" data-column="2" data-layer="' +
      moved.layer +
      '" data-reference="([^"]*)" aria-label="([^"]*)"[^>]*><span class="matrix-glyph" aria-hidden="true">\\u2192</span> <span class="matrix-word">moved</span>'
  );
  const found = page.match(cell);
  assert.ok(found, 'a moved cell is a button with the glyph of the Changes panel and its word');
  assert.equal(found[2], found[1] + ', moved, inhouse to marketplace');
  assert.doesNotMatch(page, /data-column="0"/, 'the first column compares with nothing: no button');
  assert.match(
    page,
    /<td class="matrix-cell matrix-present"><span class="matrix-glyph" aria-hidden="true">=<\/span> <span class="matrix-word">present/
  );
  assert.match(page, /<span class="matrix-glyph" aria-hidden="true">-<\/span> <span class="matrix-word">absent/);
});

test('unfolding the rows adds the lineages with no change, by the same rule: only present and absent in their cells', async () => {
  const { sandbox } = await openLayered();
  reading(sandbox, 'marketplace', true);
  const table = tableOf(sandbox.renderPlateausPageHtml());
  assert.equal(table.rows.length, CASE.rows + CASE.unchanged, 'every lineage');
  const quiet = table.rows.filter((row) =>
    row.cells.concat([row.span]).every((w) => ['present', 'absent', null].includes(w))
  );
  assert.equal(quiet.length, CASE.unchanged);
  assert.match(sandbox.renderPlateausPageHtml(), /data-action="matrix-rows" aria-pressed="false">Changes only/);
  run(sandbox, 'setMatrixRows(false)');
  assert.equal(tableOf(sandbox.renderPlateausPageHtml()).rows.length, CASE.rows);
});

test('a path of two plateaus has no Span column, and the matrix of the root alone is not offered', async () => {
  const { sandbox } = await openLayered();
  reading(sandbox, 'inhouse');
  const table = tableOf(sandbox.renderPlateausPageHtml());
  assert.equal(table.columns, 2);
  assert.equal(table.hasSpan, false);
  sandbox.openPlateauMatrix('baseline');
  assert.equal(run(sandbox, 'plateauReading.path'), 'inhouse', 'the root is no path to read');
  const page = sandbox.renderPlateausPageHtml();
  assert.doesNotMatch(page, /data-plateau="baseline"[^>]*>Read the path/);
});

// The page of a released tag, whose list of the plateaus is the reference.
const TAG = 'archicode-0.25.0';
let released = null;
try {
  released = execFileSync('git', ['show', TAG + ':src/main/resources/editor-webapp/standalone.html'], {
    cwd: ROOT,
    maxBuffer: 1 << 28,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });
} catch (e) {
  released = null; // no tag in this clone
}

test(
  'with no path chosen the list of the plateaus is the one of the released page, and the button is the only addition',
  { skip: released === null ? 'the tag ' + TAG + ' is not in this clone' : false },
  async () => {
    const now = await openLayered();
    const before = await openIn(LAYERED_FILES, { html: released });
    const strip = (html) =>
      html.replace(/<button type="button" data-action="matrix-open"[^>]*>Read the path<\/button>/g, '');
    const page = now.sandbox.renderPlateausPageHtml();
    assert.match(page, /data-action="matrix-open" data-plateau="inhouse" aria-pressed="false"/);
    assert.doesNotMatch(page, /data-action="matrix-open" data-plateau="baseline"/, 'the root has no path');
    assert.doesNotMatch(page, /matrix-block/);
    assert.equal(strip(page), strip(before.sandbox.renderPlateausPageHtml()));
    // the same after a plateau is drawn
    now.sandbox.drawPlateau('saas');
    before.sandbox.drawPlateau('saas');
    assert.equal(strip(now.sandbox.renderPlateausPageHtml()), strip(before.sandbox.renderPlateausPageHtml()));
  }
);

test('the button of the chosen plateau is pressed, openPlateauMatrix toggles it and closePlateauMatrix closes the reading', async () => {
  const { sandbox } = await openLayered();
  sandbox.openPlateauMatrix('marketplace');
  assert.equal(run(sandbox, 'plateauReading.path'), 'marketplace');
  assert.match(
    sandbox.renderPlateausPageHtml(),
    /data-action="matrix-open" data-plateau="marketplace" aria-pressed="true"/
  );
  sandbox.openPlateauMatrix('marketplace');
  assert.equal(run(sandbox, 'plateauReading.path'), null);
  sandbox.openPlateauMatrix('saas');
  sandbox.openPlateauMatrix('marketplace');
  assert.equal(run(sandbox, 'plateauReading.path'), 'marketplace');
  sandbox.closePlateauMatrix();
  assert.deepEqual(JSON.parse(JSON.stringify(run(sandbox, 'plateauReading'))), { path: null, all: false });
  assert.doesNotMatch(sandbox.renderPlateausPageHtml(), /matrix-block/);
});

test('the kernel not loaded: the block says it is reading, the page loads the kernel and draws again, then the table is there', async () => {
  const { sandbox } = await openLayered();
  run(sandbox, 'loadedKernel = null; viewpointKernelPromise = null'); // the kernel is not loaded yet, as on a first visit
  assert.equal(run(sandbox, 'loadedKernel'), null);
  reading(sandbox, 'marketplace');
  goToPlateaus(sandbox);
  const page = sandbox.renderPlateausPageHtml();
  assert.match(page, /<p class="timeline-status" role="status">Reading the plateaus…<\/p>/);
  assert.doesNotMatch(page, /<table/);
  assert.equal(run(sandbox, 'plateauMatrixIsPending()'), true);
  let redraws = 0;
  sandbox.onRedraw(() => redraws++);
  sandbox.settlePlateausPanel();
  await sandbox.loadViewpointKernel();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(redraws, 1, 'the page is drawn again once the kernel is loaded');
  assert.equal(run(sandbox, 'plateauMatrixIsPending()'), false);
  assert.equal(tableOf(sandbox.renderPlateausPageHtml()).rows.length, CASE.rows);
});

test('a pair that cannot be compared: the block names the pair, tells the sentences and draws no table; the list stays', async () => {
  const { sandbox } = await openLayered();
  reading(sandbox, 'marketplace');
  run(
    sandbox,
    `const realComparisonStateOf = comparisonStateOf;
     comparisonStateOf = (drawing, memo) => drawing.layers.current === 'marketplace' && drawing.layers.compare.other === 'inhouse'
       ? { problems: ['The plateau “marketplace” cannot be drawn, so there is nothing to compare:', 'a <mistake> & more'] }
       : realComparisonStateOf(drawing, memo);`
  );
  const page = sandbox.renderPlateausPageHtml();
  assert.match(
    page,
    /<div class="matrix-problems" role="alert"><p>The path cannot be read: inhouse and marketplace are not compared\.<\/p>/
  );
  assert.match(page, /<p>a &lt;mistake&gt; &amp; more<\/p>/);
  assert.doesNotMatch(page, /<table/);
  assert.match(page, /<ol class="timeline-list"/);
  assert.equal(run(sandbox, 'plateauMatrixNow().problems.length'), 2);
});

test('a workspace with no plateau to read, blocked layers and a stale path: no button, no block, and the reading is let go', async () => {
  // only the root: no plateau but baseline, so nothing to read
  const rootOnly = {};
  for (const [file, content] of Object.entries(LAYERED_FILES))
    if (file === '.archicode.yaml' || file.startsWith('baseline/') || file.startsWith('shared/'))
      rootOnly[file] = content;
  const one = await openIn(rootOnly);
  reading(one.sandbox, 'marketplace');
  const alone = one.sandbox.renderPlateausPageHtml();
  assert.doesNotMatch(alone, /matrix-open|matrix-block/);
  assert.equal(run(one.sandbox, 'plateauReading.path'), null, 'a path that is not in the tree is dropped');
  assert.equal(run(one.sandbox, 'plateauMatrixNow()'), null);

  // layers blocked
  const { sandbox, state } = await openLayered();
  reading(sandbox, 'marketplace');
  state.layers.blocked = 'blocked for the test';
  const blocked = sandbox.renderPlateausPageHtml();
  assert.doesNotMatch(blocked, /matrix-open|matrix-block/);
  assert.equal(run(sandbox, 'plateauReading.path'), null);

  // no layers at all
  const bare = createApp({});
  assert.equal(bare.plateauMatrixNow(), null);
  assert.doesNotThrow(() => bare.renderPlateauMatrixHtml());

  // a path that is gone from the tree, and the root
  const second = await openLayered();
  for (const stale of ['gone', 'baseline']) {
    reading(second.sandbox, stale);
    assert.doesNotMatch(second.sandbox.renderPlateausPageHtml(), /matrix-block/, stale);
    assert.equal(run(second.sandbox, 'plateauReading.path'), null, stale);
  }
});

test('a plateau that cannot be drawn has its button disabled, and a reading that ends at it is let go', async () => {
  const files = Object.assign({}, LAYERED_FILES);
  const key = Object.keys(files).find((f) => f.startsWith('marketplace/application/'));
  files[key] = files[key] + '\n---\nnot a manifest: [\n';
  const { sandbox } = await openIn(files);
  const broken = run(sandbox, "layerModelBroken('marketplace')");
  assert.ok(broken, 'the damaged manifest breaks the plateau');
  assert.match(
    sandbox.renderPlateausPageHtml(),
    /data-action="matrix-open" data-plateau="marketplace" aria-pressed="false" disabled/
  );
  reading(sandbox, 'marketplace');
  assert.doesNotMatch(sandbox.renderPlateausPageHtml(), /matrix-block/);
  assert.equal(run(sandbox, 'plateauReading.path'), null);
});

test('every reference, name and plateau id is escaped', async () => {
  const files = Object.assign({}, LAYERED_FILES);
  const key = Object.keys(files).find((f) => f.startsWith('marketplace/application/'));
  assert.ok(key);
  const { sandbox } = await openLayered();
  reading(sandbox, 'marketplace');
  run(
    sandbox,
    `const realPresence = plateauMatrixPresenceOf;
     plateauMatrixPresenceOf = (id) => realPresence(id).map((n) => n.reference === 'accounts' ? Object.assign({}, n, { name: 'N<b>&"', kind: 'k<i>' }) : n);`
  );
  const page = sandbox.renderPlateausPageHtml();
  assert.doesNotMatch(page, /<b>|<i>/);
  assert.match(page, /N&lt;b&gt;&amp;&quot;/);
});

test('the state is view state: reset with the folder, never in what a write puts back', async () => {
  const { sandbox } = await openLayered();
  reading(sandbox, 'marketplace', true);
  assert.equal(run(sandbox, "'plateauReading' in snapshotWriteState()"), false);
  const version = run(sandbox, 'modelVersion');
  sandbox.openPlateauMatrix('saas');
  assert.equal(run(sandbox, 'modelVersion'), version, 'no modelsChanged()');
  sandbox.resetUiState();
  assert.deepEqual(JSON.parse(JSON.stringify(run(sandbox, 'plateauReading'))), { path: null, all: false });
});

test('a click on a cell draws the pair of its column with { compare } and puts the Changes panel on the element', async () => {
  const { sandbox, state } = await openLayered();
  goToPlateaus(sandbox);
  reading(sandbox, 'marketplace');
  const moved = CASE.expectRows.find((row) => row.cells[2] === 'moved');
  const calls = [];
  run(
    sandbox,
    `const realDrawPlateau = drawPlateau; globalThis.__calls = [];
     drawPlateau = (id, options) => { __calls.push([id, options]); return realDrawPlateau(id, options); };`
  );
  assert.equal(sandbox.openMatrixCell('2', moved.layer, moved.expectReference || cellReference(moved)), true);
  const drawn = JSON.parse(JSON.stringify(run(sandbox, '__calls')));
  assert.deepEqual(drawn, [['marketplace', { compare: 'past' }]], 'its parent is the plateau on its left: past');
  assert.equal(state.layers.current, 'marketplace');
  assert.equal(run(sandbox, 'layerCompareChoice()'), 'past');
  assert.equal(run(sandbox, 'comparisonPanelOn()'), true);
  assert.equal(
    run(sandbox, 'changesWalk && changesWalk.key'),
    run(
      sandbox,
      `changeRowKey({ thing: 'element', layer: ${JSON.stringify(moved.layer)}, reference: ${JSON.stringify(cellReference(moved))} })`
    )
  );
  // the Span: the last plateau against the first
  const spanRow = CASE.expectRows.find((row) => row.span === 'moved');
  sandbox.openMatrixCell('span', spanRow.layer, cellReference(spanRow, 'span'));
  assert.equal(JSON.parse(JSON.stringify(run(sandbox, '__calls'))).pop()[1].compare, 'other:baseline');
  assert.equal(run(sandbox, 'layerCompareChoice()'), 'other:baseline');
  assert.equal(
    run(sandbox, 'changesWalk && changesWalk.key'),
    run(
      sandbox,
      `changeRowKey({ thing: 'element', layer: ${JSON.stringify(spanRow.layer)}, reference: ${JSON.stringify(cellReference(spanRow, 'span'))} })`
    )
  );
  // the reading stays on the page after the click
  assert.equal(run(sandbox, 'plateauReading.path'), 'marketplace');
  assert.equal(calls.length, 0);
});

/** The reference the Changes panel lists for a cell of the oracle: the element of the column (the oracle names it in `from` or as the row), for the Span the last. */
function cellReference(want) {
  return want.reference;
}

// ---- The address: matrix= and rows=all, on the page Plateaus only ----
const typeAddress = (sandbox, hash) => {
  sandbox.location.hash = hash;
  for (const fn of sandbox.__windowListeners.hashchange) fn();
};
const readingOf = (sandbox) => JSON.parse(JSON.stringify(run(sandbox, 'plateauReading')));

test('the address carries matrix= and rows=all only when set, on the page Plateaus only, after plateau=', async () => {
  const { sandbox } = await openLayered();
  goToPlateaus(sandbox);
  assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus');
  reading(sandbox, 'marketplace');
  assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus?matrix=marketplace');
  reading(sandbox, 'marketplace', true);
  assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus?matrix=marketplace&rows=all');
  run(sandbox, "drawPlateau('inhouse')");
  assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus?plateau=inhouse&matrix=marketplace&rows=all');
  run(sandbox, "currentPerspective = 'files'");
  assert.doesNotMatch(run(sandbox, 'currentRouteHash()'), /matrix=|rows=/);
});

test('an unknown, root or undrawable path drops the key, and the address is written back as it is', async () => {
  const { sandbox } = await openLayered();
  for (const bad of ['nowhere', 'baseline']) {
    typeAddress(sandbox, '#/timeline/plateaus?matrix=' + bad + '&rows=all');
    assert.equal(run(sandbox, 'currentPerspective'), 'plateaus');
    assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus', bad);
    assert.deepEqual(readingOf(sandbox), { path: null, all: false }, bad);
  }
});

test('a typed address, a reload and Back and Forward restore the path and the unfolding', async () => {
  const { sandbox } = await openLayered();
  typeAddress(sandbox, '#/timeline/plateaus?matrix=marketplace&rows=all');
  assert.deepEqual(readingOf(sandbox), { path: 'marketplace', all: true });
  assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus?matrix=marketplace&rows=all');
  typeAddress(sandbox, '#/timeline/plateaus?matrix=marketplace');
  assert.deepEqual(readingOf(sandbox), { path: 'marketplace', all: false });
  typeAddress(sandbox, '#/timeline/plateaus');
  assert.deepEqual(readingOf(sandbox), { path: null, all: false });
  sandbox.history.back();
  assert.deepEqual(readingOf(sandbox), { path: 'marketplace', all: false });
  sandbox.history.back();
  assert.deepEqual(readingOf(sandbox), { path: 'marketplace', all: true });
  sandbox.history.forward();
  assert.deepEqual(readingOf(sandbox), { path: 'marketplace', all: false });
});

test('the events matrix-open, matrix-rows and matrix-close set the reading and write it in the address', async () => {
  const { sandbox } = await openLayered();
  goToPlateaus(sandbox);
  const click = (action, data) => {
    const target = { getAttribute: (n) => (n === 'data-action' ? action : (data || {})[n]) };
    sandbox.handleAppClick({ target: { closest: () => target }, preventDefault() {}, stopPropagation() {} });
  };
  click('matrix-open', { 'data-plateau': 'marketplace' });
  assert.deepEqual(readingOf(sandbox), { path: 'marketplace', all: false });
  assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus?matrix=marketplace');
  click('matrix-rows');
  assert.deepEqual(readingOf(sandbox), { path: 'marketplace', all: true });
  assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus?matrix=marketplace&rows=all');
  click('matrix-rows');
  assert.equal(readingOf(sandbox).all, false);
  click('matrix-close');
  assert.deepEqual(readingOf(sandbox), { path: null, all: false });
  assert.equal(run(sandbox, 'currentRouteHash()'), '/timeline/plateaus');
  assert.equal(run(sandbox, 'layerChangeIsAnEntry'), false);
});
