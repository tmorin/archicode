'use strict';
// Wave 027, run 0202 (W-2, issue #178), TDD DEC-4 to DEC-8, VER-3 and the review findings F-5, F-6, F-9 and F-11 of the plan: how `layout.columns` is carried by the saved view, the toolbar, the cache key,
// the story step and the Settings page. What is fixed here, for the code to follow:
//   - the saved view keeps `properties.layout` as `{ columns: N }` in its canonical form, after `hide-unlinked` and the Map parts and before the four texts (`VIEW_PROPERTY_ORDER`); a value equal to what the
//     workspace gives for that viewpoint is not remembered; an invalid one is left as written and is a `viewProblem`;
//   - `setViewLayout(view, columns)` writes it through `putViewProperty` and takes the key out for none or for the workspace's value;
//   - `applySavedView` puts the toolbar level (`diagramColumns`, view state in model/ui-state.js, null by default) where the view says (the valid layout of the view, else null), so a value of the
//     previous diagram does not leak and `viewMatchesScreen` keeps matching (review F-5); *Keep as named view* (`currentViewDefinition`) writes the toolbar's value only, never the inherited one;
//   - the toolbar list is `<select data-action="set-columns">` labelled Columns, "Default (n)" or "Default (none)" first, then 1 to 6, 8 and 12 and always the value in force; a choice equal to what the lower
//     levels give is stored as null; it is view state (no `modelsChanged()`); the form of a saved view has the same list as `<select id="view-edit-columns" data-view-field="layout:columns">`;
//   - `diagramCacheKey` adds `cols:<n>` only when a value is set, so every key of a diagram with no value is the string it was (the old function is kept in diagram-columns-reference.js);
//   - a story step with an inline recipe (no named view) is resolved like a view, with no toolbar; the Settings save refuses an invalid `layout` of overview, detailed and deep with the sentence of DEC-1;
//     a rename or a move of an element leaves `layout` alone.
// Written first, red: none of this exists yet. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { DIAGRAM_CACHE_KEY } = require('./diagram-columns-reference');
const { run, plain, startPage, openView } = require('./library-page');

const STRATEGY = 'elk.layered.layering.strategy';
const BOUND = 'elk.layered.layering.coffmanGraham.layerBound';

/** The fixture workspace with `settings.views.properties` set, as the Settings page keeps it. */
async function pageWith(workspaceViews) {
  const page = await startPage();
  if (workspaceViews) page.state.workspace.settings.views.properties = JSON.parse(JSON.stringify(workspaceViews));
  return page;
}

const overviewView = (id, properties) => ({
  id,
  name: id,
  viewpoint: 'overview',
  layer: 'application',
  properties: Object.assign({ element: 'shop' }, properties)
});

/** The graphs the page hands to ELK, and the keys it computes for the cache, from now on. */
function record(sandbox) {
  run(
    sandbox,
    `globalThis.__calls = { graphs: [], keys: [] };
     (function () {
       const graphOf = buildElkGraph;
       buildElkGraph = function (result, options) {
         const graph = graphOf(result, options);
         globalThis.__calls.graphs.push({ options, graph });
         return graph;
       };
       const keyOf = diagramCacheKey;
       diagramCacheKey = function (recipe, comparison, viewKey) {
         const key = keyOf(recipe, comparison, viewKey);
         globalThis.__calls.keys.push({ recipe, comparison, viewKey, key });
         return key;
       };
     })();`
  );
  return () => run(sandbox, '__calls');
}

/** A control as the delegated `change` listener meets it. */
function control(attributes, props) {
  const el = Object.assign({ tagName: 'SELECT', type: 'select-one', value: '', checked: false }, props);
  el.getAttribute = (name) => (name in attributes ? attributes[name] : null);
  el.matches = () => false;
  el.closest = () => el;
  return el;
}

/** Counts the calls of `modelsChanged()` (the version counter of every cache) from now on. */
function countModelChanges(sandbox) {
  run(
    sandbox,
    `globalThis.__modelsChanged = 0;
     (function () {
       const real = modelsChanged;
       modelsChanged = function () {
         globalThis.__modelsChanged++;
         return real.apply(this, arguments);
       };
     })();`
  );
  return () => run(sandbox, '__modelsChanged');
}

// ============================================================ 1. The canonical form of a view

test('the canonical form keeps layout as { columns: N } after the lists, hide-unlinked and the Map parts, and before the four texts', async () => {
  const { sandbox } = await startPage();
  const out = plain(
    sandbox.canonicalViewProperties({
      wrap: true,
      layout: { columns: 4 },
      'hide-unlinked': true,
      applications: false,
      element: 'shop',
      facet: 'rest-only'
    })
  );
  assert.deepEqual(out.layout, { columns: 4 });
  assert.deepEqual(Object.keys(out), ['element', 'facet', 'hide-unlinked', 'applications', 'layout', 'wrap']);
  assert.deepEqual(plain(sandbox.canonicalViewProperties({ layout: { columns: 3.0 } })).layout, { columns: 3 });
  assert.equal('layout' in plain(sandbox.canonicalViewProperties({ element: 'shop' })), false, 'no layout, no key');
  assert.equal('layout' in plain(sandbox.canonicalViewProperties({ layout: null })), false, 'a null is absent');
});

test('VIEW_PROPERTY_ORDER holds layout after hide-unlinked and the Map parts and before the four texts', async () => {
  const { sandbox } = await startPage();
  const order = plain(run(sandbox, 'VIEW_PROPERTY_ORDER'));
  const at = (key) => order.indexOf(key);
  assert.ok(at('layout') > 0, 'layout is in VIEW_PROPERTY_ORDER');
  for (const before of ['hide-unlinked', 'applications', 'relationships']) assert.ok(at(before) < at('layout'), before);
  for (const after of ['labels', 'qualifiers', 'descriptions', 'wrap']) assert.ok(at('layout') < at(after), after);
});

test('a value equal to what the workspace gives for the viewpoint is not remembered; another one is; an invalid one is left as written', async () => {
  const page = await pageWith({ overview: { layout: { columns: 4 } }, map: { layout: { columns: 2 } } });
  const definition = (view) => plain(page.sandbox.canonicalViewDefinition(view));
  assert.equal('layout' in definition(overviewView('a', { layout: { columns: 4 } })).properties, false);
  assert.deepEqual(definition(overviewView('b', { layout: { columns: 5 } })).properties.layout, { columns: 5 });
  // the workspace key is the viewpoint of the view: an overview value is not the Map's
  const map = (columns) => ({ id: 'm', viewpoint: 'map', layer: 'application', properties: { layout: { columns } } });
  assert.equal('layout' in definition(map(2)).properties, false);
  assert.deepEqual(definition(map(4)).properties.layout, { columns: 4 });
  // not the editor's to rewrite: an invalid value stays as it is written
  assert.deepEqual(definition(overviewView('c', { layout: { columns: 0 } })).properties.layout, { columns: 0 });
});

// ============================================================ 2. setViewLayout

test('setViewLayout writes layout where the editor writes it, and takes it out for none or for the workspace value', async () => {
  const page = await pageWith({ overview: { layout: { columns: 4 } } });
  assert.equal(typeof page.sandbox.setViewLayout, 'function', 'the page has no setViewLayout');
  const view = overviewView('v', { 'hide-unlinked': true, labels: false });
  assert.equal(page.sandbox.setViewLayout(view, 6), true);
  assert.deepEqual(plain(view.properties.layout), { columns: 6 });
  assert.deepEqual(Object.keys(view.properties), ['element', 'hide-unlinked', 'layout', 'labels'], 'before the texts');
  assert.equal(page.sandbox.setViewLayout(view, 6), false, 'nothing changes, nothing is marked');
  assert.equal(page.sandbox.setViewLayout(view, 4), true, 'the workspace value is the default of the view');
  assert.equal('layout' in view.properties, false);
  assert.equal(page.sandbox.setViewLayout(view, 4), false);
  page.sandbox.setViewLayout(view, 7);
  assert.equal(page.sandbox.setViewLayout(view, null), true, 'none takes it out');
  assert.equal('layout' in view.properties, false);
});

test('a view that says an invalid layout cannot be drawn, with the sentence of DEC-1', async () => {
  const page = await pageWith(null);
  const view = page.sandbox.createManifestEntry('view', overviewView('bad', { layout: { columns: 0 } }));
  assert.equal(
    run(page.sandbox, 'viewProblem(findSavedView("bad"))'),
    'the view `bad` has an invalid `layout`: `columns` must be a whole number from 1 to 20 (found `0`)'
  );
  assert.ok(view);
  const fine = page.sandbox.createManifestEntry('view', overviewView('fine', { layout: { columns: 3 } }));
  assert.equal(run(page.sandbox, 'viewProblem(findSavedView(' + JSON.stringify(fine.id) + '))'), null);
});

// ============================================================ 3. applySavedView, Keep as named view, viewMatchesScreen (F-5)

test('applySavedView puts the toolbar where the view says: its layout, else null, so the value of the diagram before does not leak', async () => {
  const page = await pageWith({ overview: { layout: { columns: 2 } } });
  const wide = page.sandbox.createManifestEntry('view', overviewView('wide', { layout: { columns: 3 } }));
  const plainView = page.sandbox.createManifestEntry('view', overviewView('plain', {}));
  run(page.sandbox, 'diagramColumns = 9;');
  assert.equal(page.sandbox.applySavedView(wide), null);
  assert.equal(run(page.sandbox, 'diagramColumns'), 3, 'the view says 3');
  assert.equal(page.sandbox.applySavedView(plainView), null);
  assert.equal(run(page.sandbox, 'diagramColumns'), null, 'the view says nothing: the 9 of before does not stay');
});

test('applySavedView refuses a view with an invalid layout and leaves the toolbar alone', async () => {
  const page = await pageWith(null);
  page.sandbox.createManifestEntry('view', overviewView('bad', { layout: { columns: 99 } }));
  run(page.sandbox, 'diagramColumns = 5;');
  const problem = run(page.sandbox, 'applySavedView(findSavedView("bad"))');
  assert.match(problem, /^the view `bad` has an invalid `layout`/);
  assert.equal(run(page.sandbox, 'diagramColumns'), 5);
});

test('a view with a layout matches the screen once applied, and so does one without; Keep as named view writes the toolbar value only', async () => {
  const page = await pageWith({ overview: { layout: { columns: 4 } } });
  const wide = page.sandbox.createManifestEntry('view', overviewView('wide', { layout: { columns: 3 } }));
  const inherits = page.sandbox.createManifestEntry('view', overviewView('inherits', {}));
  assert.equal(page.sandbox.applySavedView(wide), null);
  await page.show();
  assert.equal(page.sandbox.viewMatchesScreen(wide), true);
  assert.deepEqual(plain(page.sandbox.currentViewDefinition().properties.layout), { columns: 3 });
  assert.equal(page.sandbox.applySavedView(inherits), null);
  await page.show();
  assert.equal(page.sandbox.viewMatchesScreen(inherits), true);
  assert.equal(
    'layout' in plain(page.sandbox.currentViewDefinition().properties),
    false,
    'the diagram is drawn with the 4 of the workspace, and a view kept from it says nothing of it'
  );
  run(page.sandbox, 'diagramColumns = 5;');
  assert.deepEqual(plain(page.sandbox.currentViewDefinition().properties.layout), { columns: 5 });
  assert.equal(page.sandbox.viewMatchesScreen(inherits), false, 'the screen has a layout of its own now');
});

test('a story step puts the toolbar where its view says, and a step with an inline recipe where its own layout says', async () => {
  const page = await pageWith(null);
  page.sandbox.createManifestEntry('view', overviewView('wide', { layout: { columns: 3 } }));
  page.sandbox.createManifestEntry('story', {
    id: 'tour',
    name: 'Tour',
    steps: [
      { view: 'wide' },
      { viewpoint: 'overview', layer: 'application', properties: { element: 'shop', layout: { columns: 6 } } },
      { viewpoint: 'overview', layer: 'application', properties: { element: 'shop' } }
    ]
  });
  run(page.sandbox, 'diagramColumns = 9;');
  const columnsAt = async (i) => {
    page.sandbox.goToStoryStep('tour', i);
    await page.drawn().catch(() => null);
    return run(page.sandbox, 'diagramColumns');
  };
  assert.equal(await columnsAt(0), 3);
  assert.equal(await columnsAt(1), 6);
  assert.equal(await columnsAt(2), null);
});

// ============================================================ 4. The cache key

test('the key of a diagram with no value is the key it was; with a value it says so and is another key', async () => {
  const page = await pageWith(null);
  await page.go('map');
  const calls = record(page.sandbox);
  await page.show();
  const reference = run(page.sandbox, '(' + DIAGRAM_CACHE_KEY + ')');
  const before = calls().keys.at(-1);
  assert.ok(before, 'the page computed a key');
  assert.equal(before.key, reference(before.recipe, before.comparison, before.viewKey), 'no value, the old string');
  assert.doesNotMatch(before.key, /cols:/);
  // the workspace sets a value: the recipe carries it, the key changes
  page.state.workspace.settings.views.properties = { map: { layout: { columns: 4 } } };
  await page.show();
  const after = calls().keys.at(-1);
  assert.equal(after.recipe.columns, 4);
  assert.match(after.key, /\|cols:4\|/);
  assert.notEqual(after.key, before.key);
  // the value is a part of the key, so with it removed we are back to the first string
  page.state.workspace.settings.views.properties = {};
  await page.show();
  assert.equal(calls().keys.at(-1).key, before.key);
});

// ============================================================ 5. The toolbar

/** The Columns list of the toolbar: its options as `[value, text, selected]`. */
function columnsList(html) {
  const select = /<select[^>]*data-action="set-columns"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  if (!select) return null;
  return Array.from(select[1].matchAll(/<option value="([^"]*)"( selected)?>([^<]*)<\/option>/g), (m) => [
    m[1],
    m[3],
    !!m[2]
  ]);
}

test('the Map has the Columns list: Default (none) first, then 1 to 6, 8 and 12; Default (n) when the workspace says n', async () => {
  const page = await pageWith(null);
  await page.go('map');
  assert.ok(/<label[^>]*>Columns<\/label>|aria-label="Columns"/.test(page.html()), 'the list has a name');
  const list = columnsList(page.html());
  assert.ok(list, 'a select with data-action="set-columns" is in the toolbar');
  assert.deepEqual(
    list.map(([value, text]) => [value, text]),
    [['', 'Default (none)']].concat([1, 2, 3, 4, 5, 6, 8, 12].map((n) => [String(n), String(n)]))
  );
  assert.equal(list.filter(([, , selected]) => selected).length, 1);
  assert.equal(list[0][2], true, 'Default is selected');

  page.state.workspace.settings.views.properties = { map: { layout: { columns: 4 } } };
  await page.show();
  assert.equal(columnsList(page.html())[0][1], 'Default (4)');
});

test('the list always has the value in force: 7 from the workspace is an entry, selected when it is the choice', async () => {
  const page = await pageWith(null);
  await page.go('map');
  run(page.sandbox, 'diagramColumns = 7;');
  await page.show();
  const list = columnsList(page.html());
  assert.deepEqual(
    list.find(([, , selected]) => selected).slice(0, 2),
    ['7', '7'],
    'a value the list does not offer is shown as an extra entry'
  );
});

test('choosing a value sets the toolbar, redraws, calls no modelsChanged(); the value of the lower levels is stored as null', async () => {
  const page = await pageWith({ map: { layout: { columns: 4 } } });
  await page.go('map');
  const changes = countModelChanges(page.sandbox);
  const choose = async (value) => {
    page.sandbox.handleAppChange({ target: control({ 'data-action': 'set-columns' }, { value }) });
    await page.drawn().catch(() => null);
  };
  await choose('2');
  assert.equal(run(page.sandbox, 'diagramColumns'), 2);
  await choose('4');
  assert.equal(run(page.sandbox, 'diagramColumns'), null, 'what the workspace gives is no choice');
  await choose('6');
  await choose('');
  assert.equal(run(page.sandbox, 'diagramColumns'), null, 'the Default entry');
  assert.equal(changes(), 0, 'view state: no modelsChanged()');
});

test('the toolbar choice reaches the layout engine and wins over the view and the workspace', async () => {
  const page = await pageWith({ overview: { layout: { columns: 2 } } });
  const view = page.sandbox.createManifestEntry('view', overviewView('wide', { layout: { columns: 3 } }));
  page.sandbox.applySavedView(view);
  const calls = record(page.sandbox);
  run(page.sandbox, 'diagramColumns = 5;');
  await page.show();
  const graph = calls().graphs.at(-1).graph;
  assert.equal(graph.layoutOptions[BOUND], '5');
  assert.equal(graph.layoutOptions[STRATEGY], 'COFFMAN_GRAHAM');
});

test('on the page of a saved view the list edits the view, as the four texts do', async () => {
  const page = await pageWith({ overview: { layout: { columns: 2 } } });
  const view = page.sandbox.createManifestEntry('view', overviewView('wide', { layout: { columns: 3 } }));
  await openView(page, view);
  const list = columnsList(page.right() + page.center());
  assert.ok(list, 'the toolbar of the page of a view has the list');
  assert.deepEqual(list.find(([, , selected]) => selected).slice(0, 2), ['3', '3']);
  page.sandbox.handleAppChange({ target: control({ 'data-action': 'set-columns' }, { value: '5' }) });
  await page.drawn().catch(() => null);
  assert.deepEqual(plain(view.properties.layout), { columns: 5 });
  assert.ok(
    page.state.manifestFiles.some((f) => f.dirty),
    'the view is marked modified'
  );
  page.sandbox.handleAppChange({ target: control({ 'data-action': 'set-columns' }, { value: '' }) });
  await page.drawn().catch(() => null);
  assert.equal('layout' in view.properties, false, 'Default takes the key out; the workspace value shows');
});

// ============================================================ 6. The form of a saved view

test('the form of a saved view has the Columns field, with the layout of the view, and changing it edits the view', async () => {
  const page = await pageWith(null);
  const view = page.sandbox.createManifestEntry('view', overviewView('wide', { layout: { columns: 3 } }));
  await openView(page, view);
  const right = page.right();
  const field = /<select id="view-edit-columns" data-view-field="layout:columns">([\s\S]*?)<\/select>/.exec(right);
  assert.ok(field, 'the form has the Columns field');
  assert.match(field[1], /<option value="3" selected>3<\/option>/);
  assert.match(right, /<label[^>]*for="view-edit-columns"[^>]*>Columns<\/label>/);
  page.sandbox.handleAppChange({
    target: control({ id: 'view-edit-columns', 'data-view-field': 'layout:columns' }, { value: '8' })
  });
  await page.drawn().catch(() => null);
  assert.deepEqual(plain(view.properties.layout), { columns: 8 });
  page.sandbox.handleAppChange({
    target: control({ id: 'view-edit-columns', 'data-view-field': 'layout:columns' }, { value: '' })
  });
  await page.drawn().catch(() => null);
  assert.equal('layout' in view.properties, false);
});

test('an invalid layout is an entry "invalid" in the field, with the sentence under it', async () => {
  const page = await pageWith(null);
  const view = page.sandbox.createManifestEntry('view', overviewView('bad', { layout: { columns: 0 } }));
  await openView(page, view);
  const right = page.right();
  const field = /<select id="view-edit-columns" data-view-field="layout:columns">([\s\S]*?)<\/select>/.exec(right);
  assert.ok(field, 'the form has the Columns field');
  assert.match(field[1], /<option value="invalid" selected>invalid<\/option>/);
  assert.match(
    right,
    /the view `bad` has an invalid `layout`: `columns` must be a whole number from 1 to 20 \(found `0`\)/
  );
});

// ============================================================ 7. A rename and a move leave layout alone

test('a rename or a move of the element the view names follows the element and leaves layout as it was', async () => {
  const page = await pageWith(null);
  const view = page.sandbox.createManifestEntry(
    'view',
    overviewView('wide', { 'hide-unlinked': true, layout: { columns: 3 } })
  );
  assert.equal(page.sandbox.rewriteSavedViewReferences('shop', 'store', 'application'), true);
  assert.equal(view.properties.element, 'store');
  assert.deepEqual(plain(view.properties.layout), { columns: 3 });
  assert.deepEqual(Object.keys(view.properties), ['element', 'hide-unlinked', 'layout']);
  assert.equal(page.sandbox.rewriteSavedViewReferences('store', 'shop.store', 'application'), true);
  assert.deepEqual(plain(view.properties.layout), { columns: 3 });
});

// ============================================================ 8. The story step with an inline recipe, drawn on the side

test('the scene of a step with an inline recipe is bounded by its own layout, with no toolbar; an invalid one is the sentence of step_NN', async () => {
  const page = await pageWith({ overview: { layout: { columns: 2 } } });
  page.sandbox.createManifestEntry('story', {
    id: 'inline',
    name: 'Inline',
    steps: [
      { viewpoint: 'overview', layer: 'application', properties: { element: 'shop', layout: { columns: 6 } } },
      { viewpoint: 'overview', layer: 'application', properties: { element: 'shop' } },
      { viewpoint: 'overview', layer: 'application', properties: { element: 'shop', layout: { columns: 'six' } } }
    ]
  });
  run(page.sandbox, 'diagramColumns = 9;'); // the toolbar of the editor is never the player's
  const calls = record(page.sandbox);
  const boundOf = async (i) => {
    const before = calls().graphs.length;
    const scene = await page.sandbox.storyStepScene('inline', i, { readonly: true });
    return { scene, graphs: calls().graphs.slice(before) };
  };
  const own = await boundOf(0);
  assert.equal(own.graphs.at(-1).graph.layoutOptions[BOUND], '6');
  const inherited = await boundOf(1);
  assert.equal(inherited.graphs.at(-1).graph.layoutOptions[BOUND], '2', 'the workspace level, never the toolbar 9');
  const bad = await boundOf(2);
  assert.match(
    bad.scene.problem,
    /^the view `step_03` has an invalid `layout`: `columns` must be a whole number from 1 to 20 \(found `"six"`\)/
  );
  assert.equal(bad.scene.diagram, null);
  assert.equal(run(page.sandbox, 'diagramColumns'), 9, 'the scene writes nothing');
});

// ============================================================ 9. The Settings save

/** Settings as the form hands them: the `views.properties` JSON of each viewpoint as typed, every other field as it was. */
function settingsForm(sandbox, typed) {
  const errors = {};
  const fields = {
    'settings-name-input': { value: '' },
    'settings-manifests-paths-input': { value: 'manifests' },
    'settings-views-path-input': { value: 'views' },
    'settings-facets-directory-template-input': { value: '%s-%s' },
    'settings-default-label-input': { value: 'uses' },
    'settings-facets-global-enabled-input': { checked: true }
  };
  const byId = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => {
    if (fields[id]) return fields[id];
    if (id.startsWith('view-properties-error-')) return (errors[id] = errors[id] || { textContent: '' });
    return byId(id);
  };
  const query = sandbox.document.querySelector;
  sandbox.document.querySelector = (selector) => {
    const m = /^\.json-editor-fallback\[data-viewpoint="([a-z]+)"\]$/.exec(selector);
    if (m) return { value: typed[m[1]] || '{}' };
    return query ? query.call(sandbox.document, selector) : null;
  };
  const querySelectorAll = sandbox.document.querySelectorAll;
  sandbox.document.querySelectorAll = (selector) =>
    querySelectorAll ? querySelectorAll.call(sandbox.document, selector) : [];
  return errors;
}

for (const viewpoint of ['overview', 'detailed', 'deep']) {
  test(
    'the Settings save refuses an invalid layout of ' +
      viewpoint +
      ' with the sentence, at the field, and keeps the others',
    async () => {
      const page = await pageWith(null);
      const errors = settingsForm(page.sandbox, {
        [viewpoint]: JSON.stringify({ layout: { columns: 21 } })
      });
      const draft = page.sandbox.readSettingsDraft();
      assert.equal(draft.valid, false);
      assert.equal(
        errors['view-properties-error-' + viewpoint].textContent,
        '`settings.views.properties.' +
          viewpoint +
          '.layout` is invalid: `columns` must be a whole number from 1 to 20 (found `21`)'
      );
      for (const other of ['overview', 'detailed', 'deep'].filter((v) => v !== viewpoint))
        assert.equal(
          errors['view-properties-error-' + other] ? errors['view-properties-error-' + other].textContent : '',
          ''
        );
    }
  );

  test(
    'the Settings save accepts a valid layout of ' + viewpoint + ' and writes it with the rest of the properties',
    async () => {
      const page = await pageWith(null);
      settingsForm(page.sandbox, { [viewpoint]: JSON.stringify({ layout: { columns: 4 }, other: 1 }) });
      const draft = page.sandbox.readSettingsDraft();
      assert.equal(draft.valid, true);
      const settings = page.state.workspace.settings;
      draft.apply(settings);
      assert.deepEqual(plain(settings.views.properties[viewpoint]), { layout: { columns: 4 }, other: 1 });
    }
  );
}
