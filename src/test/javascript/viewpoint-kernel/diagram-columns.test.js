'use strict';
// Wave 027, run 0202 (W-2, issue #178), TDD DEC-1 and DEC-2, REQ-2 and REQ-6: `resolveDiagramColumns({ toolbar, view, settings, viewpoint })` is the one place that knows the order of the four
// levels of `layout.columns` (the toolbar of the diagram on screen, then `view.properties.layout`, then `settings.views.properties.<viewpoint>.layout`, then none) and the one that says what an
// invalid value is. It is pure: it returns `{ columns, from, problem }` and reads nothing of the page's state. The rule of an invalid value (review F-6, plan gap-005): the levels are read from
// the most specific, a level that is not set (absent or null) is skipped, the FIRST level that is set decides, valid or not, and an invalid one is `columns: null` plus its sentence, never a
// silent fallback to a lower level and never a guess.
// Written first, red: the page has no `resolveDiagramColumns` yet. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
// through JSON: the page is another realm, its arrays and objects are not equal to ours by prototype
const plain = (value) => JSON.parse(JSON.stringify(value));

const VIEWPOINTS = ['overview', 'detailed', 'deep', 'map'];

/** The settings the resolver reads: only `views.properties` matters. */
const settingsWith = (viewpoint, layout) => ({ views: { properties: { [viewpoint]: { layout } } } });
const viewWith = (layout, id) => ({ id: id || 'v', properties: { layout } });

function resolver() {
  const sandbox = createApp();
  assert.equal(typeof sandbox.resolveDiagramColumns, 'function', 'the page has no resolveDiagramColumns (DEC-2)');
  assert.equal(typeof sandbox.columnsProblem, 'function', 'the page has no columnsProblem (DEC-2)');
  return (input) => plain(sandbox.resolveDiagramColumns(input));
}

test('the page names the range and the choices of the list: 1 to 20, and 1 to 6, 8 and 12 in the toolbar', () => {
  const sandbox = createApp();
  assert.equal(run(sandbox, 'typeof DIAGRAM_COLUMNS_MAX'), 'number', 'DIAGRAM_COLUMNS_MAX is not defined (DEC-1)');
  assert.equal(run(sandbox, 'DIAGRAM_COLUMNS_MAX'), 20);
  assert.deepEqual(plain(run(sandbox, 'DIAGRAM_COLUMNS_CHOICES')), [1, 2, 3, 4, 5, 6, 8, 12]);
});

for (const viewpoint of VIEWPOINTS) {
  test('the order is toolbar, view, workspace, none, for ' + viewpoint, () => {
    const resolve = resolver();
    const settings = settingsWith(viewpoint, { columns: 2 });
    const view = viewWith({ columns: 3 });
    assert.deepEqual(resolve({ toolbar: 4, view, settings, viewpoint }), {
      columns: 4,
      from: 'toolbar',
      problem: null
    });
    assert.deepEqual(resolve({ toolbar: null, view, settings, viewpoint }), {
      columns: 3,
      from: 'view',
      problem: null
    });
    assert.deepEqual(resolve({ toolbar: null, view: null, settings, viewpoint }), {
      columns: 2,
      from: 'workspace',
      problem: null
    });
    assert.deepEqual(resolve({ toolbar: null, view: null, settings: { views: { properties: {} } }, viewpoint }), {
      columns: null,
      from: null,
      problem: null
    });
  });
}

test('only the key of the viewpoint drawn is the workspace level: another viewpoint is not read', () => {
  const resolve = resolver();
  const settings = {
    views: { properties: { overview: { layout: { columns: 5 } }, deep: { layout: { columns: 7 } } } }
  };
  assert.equal(resolve({ toolbar: null, view: null, settings, viewpoint: 'overview' }).columns, 5);
  assert.equal(resolve({ toolbar: null, view: null, settings, viewpoint: 'deep' }).columns, 7);
  assert.equal(resolve({ toolbar: null, view: null, settings, viewpoint: 'detailed' }).columns, null);
  assert.equal(resolve({ toolbar: null, view: null, settings, viewpoint: 'map' }).columns, null);
});

test('the workspace key is the viewpoint after leafSafeViewpoint: a leaf under the Detailed tab reads the overview key', () => {
  const sandbox = createApp();
  assert.equal(typeof sandbox.resolveDiagramColumns, 'function', 'the page has no resolveDiagramColumns (DEC-2)');
  const settings = {
    views: { properties: { overview: { layout: { columns: 5 } }, detailed: { layout: { columns: 7 } } } }
  };
  const leaf = { kind: 'component' };
  const container = { kind: 'system' };
  const viewpointOf = (record) => sandbox.leafSafeViewpoint('detailed', record);
  assert.equal(viewpointOf(leaf), 'overview');
  assert.equal(viewpointOf(container), 'detailed');
  const columnsFor = (record) =>
    plain(sandbox.resolveDiagramColumns({ toolbar: null, view: null, settings, viewpoint: viewpointOf(record) }))
      .columns;
  assert.equal(columnsFor(leaf), 5);
  assert.equal(columnsFor(container), 7);
});

test('a level that is not set is skipped: no view, no properties, no layout, null, no settings, no views', () => {
  const resolve = resolver();
  const settings = settingsWith('map', { columns: 2 });
  for (const view of [null, undefined, {}, { id: 'v' }, { id: 'v', properties: null }, { id: 'v', properties: {} }]) {
    assert.deepEqual(resolve({ toolbar: null, view, settings, viewpoint: 'map' }), {
      columns: 2,
      from: 'workspace',
      problem: null
    });
  }
  // a null is absent (the reading rules of both tools), so it is no level
  assert.deepEqual(resolve({ toolbar: null, view: viewWith(null), settings, viewpoint: 'map' }), {
    columns: 2,
    from: 'workspace',
    problem: null
  });
  for (const bare of [undefined, null, {}, { views: null }, { views: {} }, { views: { properties: null } }]) {
    assert.deepEqual(resolve({ toolbar: null, view: null, settings: bare, viewpoint: 'map' }), {
      columns: null,
      from: null,
      problem: null
    });
  }
  assert.deepEqual(resolve({ toolbar: null, view: null, settings: settingsWith('map', null), viewpoint: 'map' }), {
    columns: null,
    from: null,
    problem: null
  });
  assert.deepEqual(resolve({}), { columns: null, from: null, problem: null });
});

test('a whole number from 1 to 20 is valid, written 3 or 3.0; the ends are in', () => {
  const resolve = resolver();
  for (const columns of [1, 2, 3, 3.0, 12, 19, 20]) {
    assert.deepEqual(resolve({ toolbar: null, view: viewWith({ columns }), settings: {}, viewpoint: 'overview' }), {
      columns,
      from: 'view',
      problem: null
    });
  }
});

test('an invalid view value is the sentence of DEC-1 and columns null: "3", 0, 21, 1.5, true, [] and a negative', () => {
  const resolve = resolver();
  const found = [
    ['"3"', '3'],
    ['0', 0],
    ['21', 21],
    ['1.5', 1.5],
    ['true', true],
    ['[]', []],
    ['-4', -4]
  ];
  for (const [shown, columns] of found) {
    const out = resolve({ toolbar: null, view: viewWith({ columns }, 'v'), settings: {}, viewpoint: 'overview' });
    assert.deepEqual(
      out,
      {
        columns: null,
        from: null,
        problem:
          'the view `v` has an invalid `layout`: `columns` must be a whole number from 1 to 20 (found `' + shown + '`)'
      },
      shown
    );
  }
});

test('an invalid workspace value says where it is written: the sentence of DEC-1, with the path of the key', () => {
  const resolve = resolver();
  assert.deepEqual(
    resolve({ toolbar: null, view: null, settings: settingsWith('map', { columns: '3' }), viewpoint: 'map' }),
    {
      columns: null,
      from: null,
      problem:
        '`settings.views.properties.map.layout` is invalid: `columns` must be a whole number from 1 to 20 (found `"3"`)'
    }
  );
  assert.equal(
    resolve({ toolbar: null, view: null, settings: settingsWith('deep', { columns: 21 }), viewpoint: 'deep' }).problem,
    '`settings.views.properties.deep.layout` is invalid: `columns` must be a whole number from 1 to 20 (found `21`)'
  );
});

test('a layout that is not a mapping with the one key `columns` is refused, and the sentence says what was found', () => {
  const resolve = resolver();
  const view = (layout) => resolve({ toolbar: null, view: viewWith(layout, 'v'), settings: {}, viewpoint: 'map' });
  for (const layout of [4, '4', [4], true, { rows: 4 }, { columns: 4, direction: 'RIGHT' }]) {
    const out = view(layout);
    assert.equal(out.columns, null, JSON.stringify(layout));
    assert.equal(out.from, null, JSON.stringify(layout));
    assert.match(out.problem, /^the view `v` has an invalid `layout`: /, JSON.stringify(layout));
    assert.match(out.problem, /`layout` is a mapping with the key `columns`/, JSON.stringify(layout));
  }
  assert.match(view(4).problem, /\(found `4`\)$/);
  assert.match(view({ rows: 4 }).problem, /\(found the key `rows`\)$/);
  assert.match(view({ columns: 4, direction: 'RIGHT' }).problem, /\(found the key `direction`\)$/);
  const workspace = resolve({
    toolbar: null,
    view: null,
    settings: settingsWith('map', { rows: 4 }),
    viewpoint: 'map'
  });
  assert.match(workspace.problem, /^`settings\.views\.properties\.map\.layout` is invalid: /);
  assert.match(workspace.problem, /\(found the key `rows`\)$/);
});

test('the first level that is set decides, valid or not: an invalid view does not fall back to the workspace', () => {
  const resolve = resolver();
  const settings = settingsWith('overview', { columns: 6 });
  const out = resolve({ toolbar: null, view: viewWith({ columns: 0 }, 'v'), settings, viewpoint: 'overview' });
  assert.equal(out.columns, null, 'the workspace value 6 is not used');
  assert.equal(out.from, null);
  assert.match(out.problem, /^the view `v` has an invalid `layout`/, "the view's sentence, not the workspace's");
});

test('a valid level wins over an invalid one below it: the sentence of a level that is not reached is not told', () => {
  const resolve = resolver();
  const bad = settingsWith('overview', { columns: 'x' });
  assert.deepEqual(resolve({ toolbar: null, view: viewWith({ columns: 3 }), settings: bad, viewpoint: 'overview' }), {
    columns: 3,
    from: 'view',
    problem: null
  });
  assert.deepEqual(
    resolve({ toolbar: 5, view: viewWith({ columns: 0 }), settings: bad, viewpoint: 'overview' }),
    { columns: 5, from: 'toolbar', problem: null },
    'the toolbar is the first level set, so it decides'
  );
});

test('an invalid workspace value with nothing above it is told, and draws no guess', () => {
  const resolve = resolver();
  const out = resolve({
    toolbar: null,
    view: { id: 'v', properties: {} },
    settings: settingsWith('detailed', { columns: 99 }),
    viewpoint: 'detailed'
  });
  assert.equal(out.columns, null);
  assert.equal(out.from, null);
  assert.match(out.problem, /^`settings\.views\.properties\.detailed\.layout` is invalid/);
});

test('columnsProblem checks one layout value: null for a valid one and for none, the sentence for the others', () => {
  const sandbox = createApp();
  assert.equal(typeof sandbox.columnsProblem, 'function', 'the page has no columnsProblem (DEC-2)');
  assert.equal(sandbox.columnsProblem({ columns: 4 }, 'the view `v`'), null);
  assert.equal(sandbox.columnsProblem(undefined, 'the view `v`'), null);
  assert.equal(sandbox.columnsProblem(null, 'the view `v`'), null);
  const problem = sandbox.columnsProblem({ columns: 0 }, 'the view `v`');
  assert.match(problem, /`columns` must be a whole number from 1 to 20 \(found `0`\)$/);
  assert.ok(problem.includes('the view `v`'), 'the place is in the sentence');
});
