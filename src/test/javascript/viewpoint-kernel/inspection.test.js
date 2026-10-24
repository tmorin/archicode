'use strict';
// The inspection panel (run 0018, TDD-0018): the data of the selected element in the right region of the shell, beside
// the diagram. What is checked is what the browser is given (the regions of each perspective, the markup of the shell and
// of the panel, the text of the stylesheet) and what the script does with fake elements (Close, the note of an element that
// is not on the map, the Map dropping its own selection). The look beside a real diagram is checked in a browser.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { FIXTURE, createApp, makeDirHandle, openFixture } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
const CSS_NO_COMMENTS = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

const SELECTED = 'shop.payments'; // named, described, tagged `rendering-stereotypes: external`, which the fixture styles

async function page(perspective, selection, tab) {
  const { sandbox, state } = await openFixture();
  state.selection = selection === undefined ? { kind: 'element', key: SELECTED, mode: 'view' } : selection;
  run(
    sandbox,
    "currentPerspective = '" + perspective + "'; elementTab = '" + (tab || 'details') + "'; diagramMaximized = false;"
  );
  return {
    sandbox,
    state,
    regions: () =>
      perspective === 'map' ? sandbox.renderMapPerspectiveHtml() : sandbox.renderElementsPerspectiveHtml()
  };
}

const NONE = { kind: 'none', key: null, mode: 'view' };

// ============================================================ the panel on the Map

test('the Map shows the selected element in the right panel: kind, layer, reference, description, tags, source file and its styled stereotype', async () => {
  const { regions } = await page('map');
  const right = regions().right;
  assert.ok(right, 'a panel');
  assert.match(right, /data-inspection-ref="shop\.payments" data-inspection-layer="application"/);
  assert.match(
    right,
    /<span class="inspection-name"|class="inspection-name"><span>Payment Provider<\/span>/,
    'the name'
  );
  assert.match(right, /<span class="field-label">Kind<\/span><span class="field-value">system<\/span>/);
  assert.match(right, /<span class="field-label">Layer<\/span><span class="field-value">application<\/span>/);
  assert.match(right, /<span class="field-label">Reference<\/span><span class="field-value">shop\.payments<\/span>/);
  assert.match(
    right,
    /<span class="field-label">Description<\/span><span class="field-value">Takes the money\.<\/span>/
  );
  assert.match(right, /<span class="tag-key">rendering-stereotypes<\/span>: <span class="tag-value">external<\/span>/);
  assert.match(
    right,
    /<span class="field-label">Source file<\/span><span class="field-value">manifests\/app\.shop\.yaml<\/span>/
  );
  assert.match(
    right,
    /<span class="stereotype-badge"[^>]*>external<\/span>/,
    'the text badge of the styled stereotype (run 0017)'
  );
  assert.ok(!/<span class="stereotype-badge"[^>]*>(?!external)/.test(right), 'and only the styled ones');
});

test('the panel is the rows of the Details page, from the same function', async () => {
  const { sandbox, regions } = await page('map');
  const record = sandbox.findElementRecord(SELECTED);
  assert.ok(
    regions().right.includes(sandbox.renderElementPropertiesHtml(record)),
    'renderElementPropertiesHtml, unchanged'
  );
});

test('the Map has a Close button in the panel, and the Elements diagrams do not', async () => {
  assert.match((await page('map')).regions().right, /data-action="close-inspection"/);
  for (const tab of ['overview', 'detailed', 'deep']) {
    const right = (await page('elements', undefined, tab)).regions().right;
    assert.ok(right, tab + ' has the panel');
    assert.ok(
      !right.includes('close-inspection'),
      tab + ': the selection is the element being looked at, there is nothing to close'
    );
  }
});

test('Close deselects: the panel goes and the Map keeps its width', async () => {
  const { sandbox, state, regions } = await page('map');
  let renders = 0;
  sandbox.render = () => {
    renders++;
  };
  const target = { getAttribute: (name) => (name === 'data-action' ? 'close-inspection' : null), closest: () => null };
  sandbox.handleAppClick({
    target: { closest: (selector) => (selector === '[data-action]' ? target : null) },
    preventDefault() {},
    stopPropagation() {}
  });
  assert.deepEqual(JSON.parse(JSON.stringify(state.selection)), NONE);
  assert.equal(renders, 1);
  assert.equal(regions().right, null);
  assert.equal(run(sandbox, 'currentPerspective'), 'map', 'and it stays on the Map');
});

// ============================================================ nothing rendered when there is nothing to show

test('nothing selected: no region, and no aside, no handle, no reserved space in the shell', async () => {
  for (const perspective of ['map', 'elements']) {
    const { sandbox, regions } = await page(perspective, NONE, 'overview');
    assert.equal(regions().right, null, perspective);
    const shell = sandbox.renderShellHtml();
    assert.ok(!shell.includes('panel-right') && !shell.includes('right-panel'), perspective + ': no aside');
    assert.ok(!shell.includes('data-resize="panel-right"'), perspective + ': no handle');
    assert.ok(
      shell.includes('id="panel-center" class="center-panel col-start-3 min-h-0 min-w-0"'),
      perspective + ': the centre is laid out as before'
    );
  }
});

test('Details, the edit form, the create form and the other perspectives have no panel', async () => {
  const details = await page('elements', undefined, 'details');
  assert.equal(details.regions().right, null, 'the page already says the same');
  const edit = await page('elements', { kind: 'element', key: SELECTED, mode: 'edit' }, 'overview');
  assert.equal(edit.regions().right, null, 'the form is being edited');
  assert.equal(
    (
      await page(
        'elements',
        { kind: 'create', createMode: 'top-level', category: 'application', parentReference: null },
        'overview'
      )
    ).regions().right,
    null
  );
  for (const perspective of ['files', 'library', 'settings']) {
    const { sandbox } = await page(perspective);
    const rendered = run(sandbox, 'renderActivePerspectiveHtml()');
    assert.equal(rendered.right, null, perspective);
  }
});

test('maximized: the side panels are hidden, the inspection too', async () => {
  for (const [perspective, tab] of [
    ['map', 'details'],
    ['elements', 'overview']
  ]) {
    const { sandbox, regions } = await page(perspective, undefined, tab);
    assert.ok(regions().right, perspective + ' has it first');
    run(sandbox, 'diagramMaximized = true;');
    assert.equal(regions().right, null, perspective + ' maximized');
    assert.ok(!sandbox.renderShellHtml().includes('panel-right'));
  }
});

test('an element that no longer exists has no panel, not a panel with an error', async () => {
  const { regions } = await page('map', { kind: 'element', key: 'shop.deleted', mode: 'view' });
  assert.equal(regions().right, null);
  assert.equal(
    (await page('elements', { kind: 'file', key: 'manifests/app.shop.yaml', mode: 'view' }, 'overview')).regions()
      .right,
    null,
    'a file is not an element'
  );
});

test('inspectionRecordFor: the selected element, but not one being edited, nor a file, nor nothing', async () => {
  const { sandbox } = await openFixture();
  assert.equal(sandbox.inspectionRecordFor({ kind: 'element', key: SELECTED, mode: 'view' }).reference, SELECTED);
  assert.equal(sandbox.inspectionRecordFor({ kind: 'element', key: SELECTED, mode: 'edit' }), null);
  assert.equal(sandbox.inspectionRecordFor({ kind: 'file', key: 'manifests/app.shop.yaml', mode: 'view' }), null);
  assert.equal(sandbox.inspectionRecordFor(NONE), null);
});

// ============================================================ the other layer

async function twoLayers() {
  const { sandbox, state } = await openFixture();
  const environment = state.index.technology.get('prod');
  state.index.technology.set(
    'shop',
    Object.assign({}, environment, {
      id: 'shop',
      reference: 'shop',
      name: 'Shop in production',
      description: 'The environment.',
      sourceFile: 'manifests/env.prod.yaml'
    })
  );
  run(sandbox, "currentPerspective = 'map'; diagramMaximized = false;");
  return { sandbox, state };
}

test('a reference that exists in both layers shows the layer the selection carries', async () => {
  const { sandbox, state } = await twoLayers();
  state.selection = { kind: 'element', key: 'shop', mode: 'view' };
  const application = sandbox.renderMapPerspectiveHtml().right;
  assert.match(application, /data-inspection-layer="application"/);
  assert.ok(!application.includes('Shop in production'));

  state.selection = { kind: 'element', key: 'shop', layer: 'technology', mode: 'view' };
  const technology = sandbox.renderMapPerspectiveHtml().right;
  assert.match(technology, /data-inspection-layer="technology"/);
  assert.match(technology, /<span class="field-label">Layer<\/span><span class="field-value">technology<\/span>/);
  assert.ok(technology.includes('Shop in production') && technology.includes('The environment.'));
  assert.match(
    technology,
    /The map draws applications only/,
    'the Map draws the application layer only: the panel says why the box is not there'
  );
  assert.ok(!technology.includes('id="inspection-offmap"'), 'and has no note to switch on');
});

test('the header of the Map and the panel name the same element of the two', async () => {
  const { sandbox, state } = await twoLayers();
  state.selection = { kind: 'element', key: 'shop', layer: 'technology', mode: 'view' };
  const regions = sandbox.renderMapPerspectiveHtml();
  assert.match(regions.center, /element-header-subject"[^>]*>Shop in production</);
  assert.match(regions.right, /<span>Shop in production<\/span>/);
});

test('the layer of the selection is the one of the panel in Elements too', async () => {
  const { sandbox, state } = await twoLayers();
  state.selection = { kind: 'element', key: 'shop', layer: 'technology', mode: 'view' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'overview';");
  assert.match(sandbox.renderElementsPerspectiveHtml().right, /data-inspection-layer="technology"/);
});

// ============================================================ clicks are unchanged

test('a click on a link of the panel selects on the Map without leaving it, and the panel follows', async () => {
  const { sandbox, state, regions } = await page('map');
  let renders = 0;
  sandbox.render = () => {
    renders++;
  };
  const attrs = { 'data-action': 'goto-element', 'data-ref': 'shop.catalog', 'data-layer': 'application' };
  const target = { getAttribute: (name) => attrs[name] || null, closest: () => null };
  sandbox.handleAppClick({
    target: { closest: (selector) => (selector === '[data-action]' ? target : null) },
    preventDefault() {},
    stopPropagation() {}
  });
  assert.equal(run(sandbox, 'currentPerspective'), 'map', 'the perspective is not changed');
  assert.equal(state.selection.key, 'shop.catalog');
  assert.equal(renders, 1);
  assert.match(regions().right, /data-inspection-ref="shop\.catalog"/);
  assert.match(regions().center, /Open in Elements/, 'the header of the Map is as it was');
});

test('goto-element does not know about the panel', () => {
  const handler = HTML.slice(HTML.indexOf("case 'goto-element': {"), HTML.indexOf("case 'close-inspection':"));
  assert.ok(
    handler.length > 300 && !/inspection/i.test(handler),
    'click semantics are unchanged: the panel only reads the selection'
  );
});

// ============================================================ the shell: handle and saved width

async function shellWith(storage) {
  const sandbox = createApp({ localStorage: storage });
  await sandbox.loadWorkspace(makeDirHandle(FIXTURE));
  sandbox.__state().selection = { kind: 'element', key: SELECTED, mode: 'view' };
  run(sandbox, "currentPerspective = 'map'; diagramMaximized = false;");
  return sandbox;
}

test('the shell puts the aside after the centre, with its resize handle between them', async () => {
  const shell = (await shellWith(undefined)).renderShellHtml();
  const center = shell.indexOf('id="panel-center"');
  const handle = shell.indexOf('data-resize="panel-right" data-axis="x" data-sign="-1"');
  const aside = shell.indexOf(
    '<aside id="panel-right" class="right-panel min-w-56 w-72 max-w-[40vw]" aria-label="Inspection"'
  );
  assert.ok(center > 0 && center < handle && handle < aside, 'centre, handle, aside');
  assert.ok(shell.indexOf('data-inspection-ref') > aside, 'the panel is inside the aside');
  assert.ok(!/<aside[^>]*style="[^"]*width/.test(shell), 'no saved width yet: the default of the class (18rem)');
});

test('the width the user gave the panel is kept and read back; a double click on the handle forgets it', async () => {
  const stored = new Map([['archicode-standalone-editor:panel-size:panel-right:width', '412']]);
  const storage = {
    getItem: (k) => (stored.has(k) ? stored.get(k) : null),
    setItem: (k, v) => stored.set(k, v),
    removeItem: (k) => stored.delete(k)
  };
  const sandbox = await shellWith(storage);
  assert.match(sandbox.renderShellHtml(), /<aside id="panel-right"[^>]*style="width: 412px;"/);
  let renders = 0;
  sandbox.render = () => {
    renders++;
  };
  sandbox.handleAppDblClick({
    target: {
      closest: (selector) => (selector === '[data-resize]' ? { dataset: { resize: 'panel-right', axis: 'x' } } : null)
    }
  });
  assert.equal(stored.has('archicode-standalone-editor:panel-size:panel-right:width'), false);
  assert.equal(renders, 1);
});

// ============================================================ what the page does when the drawing changes

/** Fake elements for the two lookups of the panel (the harness has no DOM). */
function fakeDocument(sandbox, { note, holder, removed }) {
  sandbox.document.getElementById = (id) => (id === 'inspection-offmap' ? note : null);
  sandbox.document.querySelector = (selector) => (selector === '[data-inspection-ref]' ? holder : null);
  sandbox.document.querySelectorAll = (selector) => {
    if (selector === '#panel-right, [data-resize="panel-right"]')
      return [
        {
          remove() {
            removed.push('panel');
          }
        },
        {
          remove() {
            removed.push('handle');
          }
        }
      ];
    return [];
  };
}

test('the note of an element that is not on the map follows the drawing', async () => {
  const { sandbox } = await page('map');
  const note = { hidden: true };
  fakeDocument(sandbox, { note, holder: { getAttribute: () => SELECTED }, removed: [] });

  run(sandbox, "diagramScene = { viewKey: 'map|x', boxes: { 'shop.web': {} }, expandable: [] };");
  sandbox.markInspection();
  assert.equal(note.hidden, false, 'not drawn: the note shows');

  run(sandbox, "diagramScene = { viewKey: 'map|x', boxes: { 'shop.payments': {} }, expandable: [] };");
  sandbox.markInspection();
  assert.equal(note.hidden, true, 'drawn: it goes');

  run(sandbox, "diagramScene = { viewKey: 'map|x', boxes: { 'shop.web': {} }, expandable: [] };");
  sandbox.markInspection();
  run(sandbox, 'diagramScene = null;');
  sandbox.markInspection();
  assert.equal(note.hidden, true, 'nothing drawn yet (computing): no claim');
});

test('the note is in the panel of the Map for an application element, hidden until a drawing says so', async () => {
  const { regions } = await page('map');
  assert.match(regions().right, /<p class="inspection-note" id="inspection-offmap" hidden>Not on the map right now/);
  assert.ok(
    !(await page('elements', undefined, 'overview')).regions().right.includes('inspection-offmap'),
    'a diagram of Elements draws its own element'
  );
});

test('markInspection does nothing without a panel', async () => {
  const { sandbox } = await page('map');
  fakeDocument(sandbox, { note: null, holder: null, removed: [] });
  assert.doesNotThrow(() => sandbox.markInspection());
});

test('the Map drops the panel and its handle together with the selection it drops', async () => {
  const { sandbox } = await page('map');
  const removed = [];
  fakeDocument(sandbox, { note: null, holder: null, removed });
  sandbox.removeInspectionPanel();
  assert.deepEqual(removed, ['panel', 'handle']);
  const body = HTML.slice(HTML.indexOf('function showDiagramScene('), HTML.indexOf('function markMapSelection('));
  const clear = body.indexOf("AppState.selection = { kind: 'none', key: null, mode: 'view' };");
  assert.ok(
    clear > 0 && body.indexOf('removeInspectionPanel();', clear) > clear,
    'in the branch where showDiagramScene clears the selection'
  );
  assert.ok(
    body.indexOf('markInspection();') > body.indexOf('markMapScope();'),
    'and the note is set after each drawing'
  );
});

test('a name from the YAML never reaches the panel as markup', async () => {
  const { sandbox, state, regions } = await page('map');
  const record = state.index.application.get(SELECTED);
  record.name = '<img src=x onerror=alert(1)>';
  record.description = '</div><script>alert(2)</script>';
  record.sourceFile = '"><b>';
  const right = regions().right;
  assert.ok(!right.includes('<img') && !right.includes('<script') && !right.includes('<b>'));
  assert.ok(right.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

// ============================================================ scroll and stylesheet

test('the scroll of the panel is kept for the same view only, like the centre', () => {
  const render = HTML.slice(HTML.indexOf('\nfunction render() {'));
  assert.match(
    render.slice(0, render.indexOf('\nfunction ', 10) > 0 ? render.indexOf('\n}\n') : undefined),
    /id === 'panel-center' \|\| id === 'panel-right'\) && !sameView\) continue;/
  );
});

const ruleBodies = (css, selector) =>
  Array.from(css.matchAll(/([^{}@]+)\{([^{}]*)\}/g))
    .filter((m) => m[1].trim() === selector)
    .map((m) => m[2].trim());

test('inside the panel the rows stack, label over value', () => {
  assert.match(ruleBodies(CSS_NO_COMMENTS, '.inspection .field-row')[0], /flex-direction: column/);
  assert.match(ruleBodies(CSS_NO_COMMENTS, '.inspection .field-label')[0], /width: auto/);
  assert.ok(
    !/\.field-row[^{]*\{[^}]*flex-direction/.test(CSS_NO_COMMENTS.replace(/\.inspection \.field-row\s*\{[^}]*\}/, '')),
    'the Details page keeps its rows'
  );
});

test('the panel adds no colour of its own: only the variables of the theme, the same in light and dark', () => {
  const own = Array.from(CSS_NO_COMMENTS.matchAll(/(\.inspection[^{]*)\{([^{}]*)\}/g))
    .map((m) => m[2])
    .join(';');
  assert.ok(own.length > 100, 'the rules of the panel were found');
  assert.ok(!/--[a-z-]+\s*:/.test(own), 'no custom property is declared');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/.test(own.replace(/rgba?\(0, 0, 0[^)]*\)/g, '')), 'no literal colour');
  for (const used of own.matchAll(/var\((--[a-z-]+)\)/g)) {
    assert.ok(new RegExp(used[1] + '\\s*:').test(CSS_NO_COMMENTS), used[1] + ' is a variable of the theme');
  }
});

test('the rules of the panel are not inside a container query (they do not depend on the width of the centre)', () => {
  const at = CSS_NO_COMMENTS.indexOf('.inspection {');
  assert.ok(at > 0);
  const before = CSS_NO_COMMENTS.slice(0, at);
  assert.equal(
    (before.match(/\{/g) || []).length,
    (before.match(/\}/g) || []).length,
    'at the top level of the stylesheet'
  );
});
