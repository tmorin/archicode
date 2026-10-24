'use strict';
// Wave 016, run 0117 (W-11, issue #118): a performance budget for the editor at the size of the largest fixture. The first render of an element through a facet, the Map (both layers, folded
// and unfolded as far as it goes), `quiet` and the list of changes must not ask more of the kernel, and must not read the rows of the comparison more often per row, because the model is
// larger. Two sizes are measured with the real page, the real kernel and a fake layout engine:
//   - the layered Brightcart, plateau `marketplace` compared with `inhouse`: 82 elements, 65 changes;
//   - the invented harbour of `replaces-large-pair`, plateau `after` compared with `before`: 591 elements, 839 changes (the largest pair of the repository; the sizes are asserted below).
// What is ASSERTED is a count, and, since run 0143 (issue #125), the time of the two kernel entries that grew with the square of the elements, as a ratio (the 591 elements to the 82, measured in
// the same run on the same machine, so that a slow machine does not fail it) (a ceiling in ms was tried and fails when the whole suite runs at once, the ratio does not); every other time is only recorded. (1) the calls to the kernel, entry by entry (`compute`, `quiet`, `compare`, `applyPatches`), which depend on the number of plateaus, of layers and of
// renders and on nothing else; (2) the reads of the rows of the table of changes (every property read of a row, every index read of the table, through a Proxy), which may grow with the number of
// rows (a list shows every row) but at the same rate per row, so that a list that was quadratic in the rows would be seen. What is RECORDED is the times (`t.diagnostic`: the wall time of each step
// and the time spent in each kernel entry): they depend on the machine, and the layout of ELK (the cost of the extra boxes of an unfolded Map, run 0114) is not in them, the layout engine
// being a fake. The test of the instruments last of all runs the same steps on a page that was made to grow (one `compute` per element, a list that reads every row for every row) and
// expects the comparison to say so: a budget that cannot fail checks nothing.
// Everything here is invented. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { startPage, run, click } = require('./library-page');
const { compareWith } = require('./layered-folders');

const RESOURCES = path.resolve(__dirname, '../../resources');
const FIXTURES = {
  small: {
    name: 'brightcart marketplace',
    dir: path.join(RESOURCES, 'brightcart/layered'),
    plateau: 'marketplace',
    against: 'inhouse',
    select: 'commerce',
    facet: 'journey', // a facet of the workspace
    elements: 82,
    changes: 65
  },
  large: {
    name: 'harbour after',
    dir: path.join(RESOURCES, 'replaces-large-pair'),
    plateau: 'after',
    against: 'before',
    select: 'berth-allocation',
    facet: {
      name: 'budget-facet',
      actions: [
        { operator: 'REMOVE', jsonPath: "$.application..elements[?(@.id == 'customs-officer' || @.id == 'pilot')]" }
      ]
    },
    elements: 591,
    changes: 839
  }
};
const KERNEL_ENTRIES = ['compute', 'quiet', 'compare', 'applyPatches'];
const NOTHING = { compute: 0, quiet: 0, compare: 0, applyPatches: 0 };
const WALKS = 10;
const settle = async () => {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 20));
};

/**
 * One fixture opened as the editor opens it, with the kernel and the rows of the comparison metered. `calls` and `rowReads` are read and reset by `step`.
 * The kernel entries are wrapped on the object the page holds (`loadedKernel`), so every call the page makes is counted, whoever makes it.
 */
async function open(fixture) {
  const page = await startPage({ dir: fixture.dir });
  const sandbox = page.sandbox;
  sandbox.__clock = () => performance.now();
  run(
    sandbox,
    `
    globalThis.__meter = { calls: { compute: 0, quiet: 0, compare: 0, applyPatches: 0 }, ms: { compute: 0, quiet: 0, compare: 0, applyPatches: 0 }, rows: 0, table: 0 };
    for (const name of Object.keys(__meter.calls)) {
      const original = loadedKernel[name];
      loadedKernel[name] = function (input) { __meter.calls[name]++; const t = __clock(); const out = original.call(this, input); __meter.ms[name] += __clock() - t; return out; };
    }
  `
  );
  const facet = typeof fixture.facet === 'string' ? fixture.facet : fixture.facet.name;
  if (typeof fixture.facet !== 'string') page.state.workspace.settings.facets.customs.push(fixture.facet);
  const meter = () => JSON.parse(JSON.stringify(run(sandbox, '__meter')));
  const reset = () =>
    run(
      sandbox,
      '__meter.rows = 0; __meter.table = 0; for (const k of Object.keys(__meter.calls)) { __meter.calls[k] = 0; __meter.ms[k] = 0; }'
    );
  /** Runs `action`, and says what it cost: the kernel calls (and their time), the reads of the rows (and of the table), and the wall time. */
  const step = async (name, action) => {
    reset();
    const t0 = performance.now();
    await action();
    const wall = performance.now() - t0; // the action and the drawing it waits for; `settle` only lets the work the render starts after itself (the tree's `quiet`) end, so that it is counted
    await settle();
    const m = meter();
    return { name, calls: m.calls, kernelMs: m.ms, rowReads: m.rows, tableReads: m.table, wallMs: wall };
  };
  /** The rows of the table of changes of the comparison now on, through proxies that count every read (the answer the page keeps is changed in place, the next read finds the proxies). */
  const meterRows = () => {
    sandbox.comparisonState();
    run(
      sandbox,
      `{
      const value = comparisonCache.value;
      const rows = value.answer.changes.map((row) => new Proxy(row, { get(target, key) { __meter.rows++; return target[key]; } }));
      value.answer.changes = new Proxy(rows, { get(target, key) { if (typeof key === 'string' && /^\\d+$/.test(key)) __meter.table++; return target[key]; } });
      value.shown = null;
    }`
    );
  };
  return { page, sandbox, state: page.state, facet, step, meterRows, reset, meter };
}

/** Every step of the scenario, in order, on one fixture: what the editor does when a workspace is opened and read. */
async function scenario(fixture, options) {
  const ctx = await open(fixture);
  const { page, sandbox, state, step } = ctx;
  if (options && options.patch) run(sandbox, options.patch);
  const steps = {};
  steps.draw = await step('draw the plateau', async () => {
    sandbox.drawPlateau(fixture.plateau);
  });
  const tree = run(sandbox, 'AppState.plateauTree');
  steps.chain = {
    plateaus: tree.nodes.size,
    patched: Array.from(tree.nodes.values()).filter((node) => node.patches.length).length
  };
  const elements = state.index.application.size + state.index.technology.size;
  steps.compare = await step('compare with ' + fixture.against, async () => {
    compareWith(sandbox, fixture.against);
    sandbox.comparisonState();
  });
  ctx.meterRows();
  const changes = sandbox.comparisonState().changes.length;
  // the first render of an element through a facet: the diagram, the tabs that have something to draw, and the elements of the tree that the facet leaves with nothing to draw (`quiet`)
  steps.first = await step('first render of ' + fixture.select + ' through the facet', async () => {
    click(sandbox, { 'data-action': 'select-element', 'data-ref': fixture.select, 'data-layer': 'application' });
    run(sandbox, `elementTab = 'overview'; diagramFacet = ${JSON.stringify(ctx.facet)};`);
    sandbox.setPerspective('elements');
    await page.drawn();
  });
  if (options && options.until === 'first') return { fixture, elements, changes, steps };
  steps.again = await step('render again', async () => {
    sandbox.render();
    await page.drawn();
  });
  steps.quietAgain = await step('quiet again', async () => {
    sandbox.quietReferencesThroughFacet(await sandbox.loadViewpointKernel(), run(sandbox, 'currentDiagramFacet()'));
  });
  // the Maps, folded and then unfolded one level at a time as far as they go
  run(sandbox, 'diagramFacet = null;');
  for (const [key, perspective, layer] of [
    ['application', 'map', 'application'],
    ['technology', 'environments', 'technology']
  ]) {
    steps[key + 'Map'] = await step('Map of the ' + layer + ' layer, folded', async () => {
      await page.go(perspective);
    });
    const unfolds = [];
    for (let i = 0; i < 12; i++) {
      const more = run(sandbox, '(diagramScene && diagramScene.expandable) || []').length;
      if (!more) break;
      unfolds.push(
        Object.assign(
          await step('unfold all, level ' + (i + 1), async () => {
            click(sandbox, { 'data-action': 'unfold-all' });
            await page.drawn();
          }),
          { opened: more, boxes: run(sandbox, 'diagramScene.drawnIds ? diagramScene.drawnIds.size : 0') }
        )
      );
    }
    steps[key + 'Unfolds'] = unfolds;
  }
  // the list of changes: the page Plateaus (the tree with a count per plateau), the list itself, ten steps of the walk, a filter and back
  steps.plateaus = await step('page Plateaus', async () => {
    await page.go('plateaus');
  });
  steps.panel = await step('the list of changes', async () => {
    sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  });
  steps.walk = await step('walk ' + WALKS + ' changes', async () => {
    for (let i = 0; i < WALKS; i++) sandbox.walkChange('next');
  });
  steps.filter = await step('filter to the new ones and back', async () => {
    sandbox.setChangesFilter('state', 'new');
    sandbox.setChangesFilter('state', 'all');
  });
  return { fixture, elements, changes, steps };
}

let measured = null;
const measure = () =>
  (measured =
    measured ||
    Promise.all([scenario(FIXTURES.small), scenario(FIXTURES.large)]).then(([small, large]) => ({ small, large })));

const fmt = (n) => n.toFixed(1);

// ---- the comparison of the two sizes: the same two functions judge the real page and the page made to grow ----

/** The kernel calls of a step must be the same at both sizes: the problems, as sentences. */
function callsDiffer(label, small, large) {
  const out = [];
  for (const entry of KERNEL_ENTRIES)
    if (small[entry] !== large[entry])
      out.push(
        label +
          ': ' +
          entry +
          ' is called ' +
          small[entry] +
          ' times at ' +
          FIXTURES.small.elements +
          ' elements and ' +
          large[entry] +
          ' times at ' +
          FIXTURES.large.elements +
          ' elements'
      );
  return out;
}

/** The reads of the rows, per row, may not grow by more than a quarter from the small pair to the large one (the page reads each row a fixed number of times). */
function readsGrow(label, small, large, smallRows, largeRows) {
  const perSmall = (small.rowReads + small.tableReads) / smallRows;
  const perLarge = (large.rowReads + large.tableReads) / largeRows;
  return perLarge > perSmall * 1.25
    ? [label + ': ' + fmt(perSmall) + ' reads per row at ' + smallRows + ' rows, ' + fmt(perLarge) + ' at ' + largeRows]
    : [];
}

const callsOf = (step) => step.calls;

/** All the problems of the two measures, as sentences (none: the page holds). */
function problemsOf(small, large, only) {
  const out = [];
  const want = (name) => !only || only.includes(name);
  const each = (name, a, b) => {
    if (want(name)) {
      out.push(...callsDiffer(name, callsOf(a), callsOf(b)));
      out.push(...readsGrow(name, a, b, small.changes, large.changes));
    }
  };
  for (const name of [
    'draw',
    'compare',
    'first',
    'again',
    'quietAgain',
    'applicationMap',
    'technologyMap',
    'plateaus',
    'panel',
    'walk',
    'filter'
  ])
    each(name, small.steps[name], large.steps[name]);
  return out;
}

// ---- 1. the two sizes are the sizes the issue names ----

test('#118: the two pairs are the sizes that are measured: 82 elements and 65 changes, and 591 elements and 839 changes', async () => {
  const { small, large } = await measure();
  assert.equal(small.elements, FIXTURES.small.elements);
  assert.equal(small.changes, FIXTURES.small.changes);
  assert.equal(large.elements, FIXTURES.large.elements);
  assert.equal(large.changes, FIXTURES.large.changes);
  assert.ok(large.elements / small.elements > 7, 'the larger is more than seven times the smaller');
});

// ---- 2. the calls to the kernel ----

test('#118: drawing a plateau makes one call per plateau of the tree that has patches, comparing it makes one `compare`, at both sizes', async () => {
  const { small, large } = await measure();
  for (const m of [small, large]) {
    assert.equal(
      m.steps.draw.calls.applyPatches,
      m.steps.chain.patched,
      m.fixture.name + ': drawing resolves each plateau of the tree that has patches once, and no other'
    );
    assert.deepEqual(
      [m.steps.draw.calls.quiet, m.steps.draw.calls.compare],
      [0, 0],
      m.fixture.name + ': and asks the kernel for no `quiet` and no `compare`'
    );
    assert.ok(
      m.steps.draw.calls.compute <= 1,
      m.fixture.name + ': the page it lands on draws with one `compute` at most'
    );
    assert.ok(m.steps.chain.patched >= 1, m.fixture.name + ': the chain has a layer with patches');
    const { compute, ...others } = m.steps.compare.calls;
    assert.deepEqual(
      others,
      { quiet: 0, compare: 1, applyPatches: 0 },
      m.fixture.name +
        ': one `compare`, no other kernel call but the one `compute` of the page that is drawn again with the union (' +
        compute +
        ')'
    );
    assert.ok(compute <= 1, m.fixture.name + ': at most one `compute`');
  }
});

test('#118: the first render of an element through a facet is at most three `compute` (the diagram and its tabs) and one `quiet` per layer, the same at both sizes; the next render and the next `quiet` ask nothing', async () => {
  const { small, large } = await measure();
  for (const m of [small, large]) {
    assert.equal(
      m.steps.first.calls.quiet,
      2,
      m.fixture.name + ': one `quiet` for each of the two layers, however many elements'
    );
    assert.ok(
      m.steps.first.calls.compute >= 1 && m.steps.first.calls.compute <= 3,
      m.fixture.name + ': compute: ' + m.steps.first.calls.compute
    );
    assert.equal(
      m.steps.first.calls.compare + m.steps.first.calls.applyPatches,
      0,
      m.fixture.name + ': the comparison and the layers are not asked again'
    );
    assert.deepEqual(
      m.steps.again.calls,
      NOTHING,
      m.fixture.name + ': a render of what is already drawn asks nothing of the kernel'
    );
    assert.deepEqual(
      m.steps.quietAgain.calls,
      NOTHING,
      m.fixture.name + ': nor does the tree, which finds its answer in the cache'
    );
  }
  assert.deepEqual(callsDiffer('first', small.steps.first.calls, large.steps.first.calls), []);
});

test('#118: a Map is one `compute` a render, folded and unfolded, in both layers: the boxes grow, the calls do not', async () => {
  const { small, large } = await measure();
  for (const m of [small, large]) {
    for (const key of ['application', 'technology']) {
      const folded = m.steps[key + 'Map'];
      assert.deepEqual(
        folded.calls,
        Object.assign({}, NOTHING, { compute: 1 }),
        m.fixture.name + ' ' + key + ': the folded Map is one `compute`'
      );
      const unfolds = m.steps[key + 'Unfolds'];
      assert.ok(unfolds.length >= 1, m.fixture.name + ' ' + key + ': the Map has something to unfold');
      for (const [i, unfold] of unfolds.entries()) {
        assert.deepEqual(
          unfold.calls,
          Object.assign({}, NOTHING, { compute: 1 }),
          m.fixture.name +
            ' ' +
            key +
            ', level ' +
            (i + 1) +
            ': one `compute`, whatever the number of boxes it opens (' +
            unfold.boxes +
            ')'
        );
      }
    }
  }
});

test('#118: the page Plateaus asks for one `compare` per plateau that has a past (a count by plateau), the list of changes, the walk and the filters ask for nothing', async () => {
  const { small, large } = await measure();
  for (const m of [small, large]) {
    assert.deepEqual(
      m.steps.plateaus.calls,
      Object.assign({}, NOTHING, { compare: m.steps.chain.plateaus - 1 }),
      m.fixture.name + ': one `compare` for each plateau but the root'
    );
    for (const name of ['panel', 'walk', 'filter'])
      assert.deepEqual(m.steps[name].calls, NOTHING, m.fixture.name + ': ' + name + ' asks nothing of the kernel');
  }
  assert.equal(
    small.steps.chain.plateaus,
    large.steps.chain.plateaus,
    'the two fixtures have as many plateaus, so the count is the same'
  );
});

// ---- 3. the reads of the rows ----

test('#118: the list of changes, the pages that show it and the walk read each row a fixed number of times, at both sizes', async (t) => {
  const { small, large } = await measure();
  const per = (m, name) => (m.steps[name].rowReads + m.steps[name].tableReads) / m.changes;
  for (const name of ['first', 'again', 'applicationMap', 'technologyMap', 'plateaus', 'panel', 'walk', 'filter']) {
    t.diagnostic(
      'reads per row, ' +
        name +
        ': ' +
        fmt(per(small, name)) +
        ' at ' +
        small.changes +
        ' rows, ' +
        fmt(per(large, name)) +
        ' at ' +
        large.changes
    );
  }
  assert.deepEqual(
    problemsOf(small, large, [
      'first',
      'again',
      'applicationMap',
      'technologyMap',
      'plateaus',
      'panel',
      'walk',
      'filter'
    ]).filter((p) => /reads per row/.test(p)),
    []
  );
  // the list does read the rows: a budget measured on a list that reads nothing would hold for any page
  assert.ok(per(small, 'panel') >= 1 && per(large, 'panel') >= 1, 'the list reads every row at least once');
  assert.ok(per(large, 'panel') < 200, 'and a bounded number of times: ' + fmt(per(large, 'panel')));
  // a walk of ten steps is ten times a step, not more (each step reads the table, which is linear): the cost of a step per row does not depend on the position either
  assert.ok(
    per(large, 'walk') / WALKS < 120,
    'one step of the walk: ' + fmt(per(large, 'walk') / WALKS) + ' reads per row'
  );
});

// ---- 4. the times: recorded, and for two entries bounded ----

test('#118: the times of each step at both sizes are recorded', async (t) => {
  const { small, large } = await measure();
  const names = [
    'draw',
    'compare',
    'first',
    'again',
    'quietAgain',
    'applicationMap',
    'technologyMap',
    'plateaus',
    'panel',
    'walk',
    'filter'
  ];
  for (const name of names) {
    const a = small.steps[name];
    const b = large.steps[name];
    const kernel = (s) =>
      Object.entries(s.kernelMs)
        .filter(([, ms]) => ms > 0)
        .map(([entry, ms]) => entry + ' ' + fmt(ms))
        .join(', ') || '-';
    t.diagnostic(
      name.padEnd(15) +
        ' ' +
        FIXTURES.small.elements +
        ' elements: ' +
        fmt(a.wallMs).padStart(7) +
        ' ms (kernel: ' +
        kernel(a) +
        ')   ' +
        FIXTURES.large.elements +
        ' elements: ' +
        fmt(b.wallMs).padStart(7) +
        ' ms (kernel: ' +
        kernel(b) +
        ')'
    );
  }
  for (const key of ['application', 'technology']) {
    for (const [label, m] of [
      ['small', small],
      ['large', large]
    ]) {
      t.diagnostic(
        key +
          ' Map, ' +
          label +
          ': ' +
          m.steps[key + 'Unfolds'].map((u) => u.boxes + ' boxes in ' + fmt(u.wallMs) + ' ms').join(', ')
      );
    }
  }
  assert.ok(
    names.every((name) => Number.isFinite(small.steps[name].wallMs) && Number.isFinite(large.steps[name].wallMs))
  );
});

// What the kernel did in a step, in ms, for an entry. `quiet` and `apply_patches` (issue #125, run 0143) took 19 and 18 times longer at 591 elements than at 82 (7.2 times more), because
// each `quiet` view rebuilt what every other one reads and each `REMOVE` read the whole graph twice; they now take 8 and 5 times longer on the first pair of a process, and 10 to 11 and 12 to 13
// times on the pairs that follow it (run 0173: the small pair is faster once the WebAssembly is compiled, the large one is not), which are the ones the budget judges. The limit of 16 sits between
// 13 and the 18 and 19 of the old kernel (measured on its first pair only; warm, its small pair is faster, so its ratio can only be higher).
// A shared runner (CI) does not scale like a developer's machine: the first run of CI of wave 019 measured `apply_patches` at 11.8 ms at 82 elements, as here, and 180.6 ms at 591
// elements, where here it takes 69 (15.3 times, 6.7 here), the kernel being the same: the large pair spills out of the caches there. The limits are twice as wide when `CI` is set; the
// old kernel still fails them on a runner, where it is slower still, and the numbers are in the diagnostics of every run.
const CI_SLACK = process.env.CI ? 2 : 1;
const TIME_BUDGET = [
  { label: 'first `quiet`', step: 'first', entry: 'quiet', ratio: 16 },
  { label: '`apply_patches` of the plateau drawn', step: 'draw', entry: 'applyPatches', ratio: 16 }
];

/** The problems of a kernel entry whose time grows faster than the elements: as sentences. */
function timeProblems(budget, small, large) {
  const a = small.steps[budget.step].kernelMs[budget.entry];
  const b = large.steps[budget.step].kernelMs[budget.entry];
  const out = [];
  if (!(a > 0)) out.push(budget.label + ': the small pair made no call to measure');
  else if (b / a > budget.ratio)
    out.push(
      budget.label +
        ': ' +
        fmt(b) +
        ' ms at ' +
        FIXTURES.large.elements +
        ' elements is ' +
        fmt(b / a) +
        ' times the ' +
        fmt(a) +
        ' ms at ' +
        FIXTURES.small.elements +
        ' (the limit is ' +
        budget.ratio +
        ')'
    );
  return out;
}

// Wave 023, run 0173 (W-10): one measure of a time is a sample of the machine as much as of the kernel. Under the load of the whole suite, or with the V8 coverage that `npm run test:coverage` switches
// on, a single pair of runs read 15.3 times (the limit was 12) where the same kernel reads 7.8 alone. And the first pair of a process is not the kernel's ratio either: the small pair pays for the
// compilation of the WebAssembly (11.5 ms for the first `quiet`, 5.5 ms from the second pair on) and the large one does not notice (60 ms both times), so the ratio of the first pair (6.5) is half of
// the ratio of the next ones (about 11). The budget is therefore judged on the fastest of TIME_REPEATS runs at each size, after TIME_WARMUPS runs that are thrown away, run one after the other (a
// pause for the garbage collector or another process lengthens a run, it never shortens one): the ratio of the two best times is the kernel's, and the limits below are set on that ratio. The
// scenario stops at the first render, which is all the two budgets read (`draw` and `first`).
const TIME_WARMUPS = 1;
const TIME_REPEATS = 4;
const TIMED_STEPS = ['draw', 'first'];

/** The fastest time of each kernel entry of the timed steps, over several runs of one scenario: the same shape as a run, `steps[step].kernelMs[entry]`. */
function fastest(runs) {
  const steps = {};
  for (const step of TIMED_STEPS) {
    const kernelMs = {};
    for (const entry of KERNEL_ENTRIES) kernelMs[entry] = Math.min(...runs.map((r) => r.steps[step].kernelMs[entry]));
    steps[step] = { kernelMs };
  }
  return { steps, elements: runs[0].elements };
}

async function bestTimes() {
  const small = [];
  const large = [];
  for (let i = 0; i < TIME_WARMUPS + TIME_REPEATS; i++) {
    const pair = [
      await scenario(FIXTURES.small, { until: 'first' }),
      await scenario(FIXTURES.large, { until: 'first' })
    ];
    if (i >= TIME_WARMUPS) {
      small.push(pair[0]);
      large.push(pair[1]);
    }
  }
  return { small: fastest(small), large: fastest(large) };
}

// The ratio is only the kernel's on a quiet machine. With the 70 files of the suite running at once on every core (and with the V8 coverage of `npm run test:coverage`), the large pair, which does
// not fit the caches, takes 100 ms where it takes 60 ms alone while the small one does not move: the same kernel reads 17 times where it reads 11 (the old, quadratic one reads about 19 and
// more), so no limit separates the two under that load, and neither does the fastest of any number of runs, since the whole file runs under it. The time is therefore judged where the machine is
// quiet: `npm run test:timing` (ARCHICODE_TIMING=1, this file alone, the CI step "Check the time budget of the kernel"); in the suite the test is skipped and says so. The counts of calls and of
// reads, the other tests of this file, and the budget's own logic (the test after the next ones) run in the suite and do not depend on the machine.
const TIMING = process.env.ARCHICODE_TIMING === '1';
test(
  '#125: the first `quiet` and the `apply_patches` of a plateau take less than sixteen times as long at 591 elements as at 82',
  {
    skip: TIMING ? false : 'a time is judged on a quiet machine: npm run test:timing'
  },
  async (t) => {
    const { small, large } = await bestTimes();
    for (const budget of TIME_BUDGET) {
      const a = small.steps[budget.step].kernelMs[budget.entry];
      const b = large.steps[budget.step].kernelMs[budget.entry];
      t.diagnostic(
        budget.label +
          ': ' +
          fmt(a) +
          ' ms at ' +
          FIXTURES.small.elements +
          ', ' +
          fmt(b) +
          ' ms at ' +
          FIXTURES.large.elements +
          ' (' +
          fmt(b / a) +
          ' times, elements: ' +
          fmt(large.elements / small.elements) +
          ' times)'
      );
      assert.deepEqual(timeProblems(Object.assign({}, budget, { ratio: budget.ratio * CI_SLACK }), small, large), []);
    }
  }
);

// ---- 5. the instruments see a page that grows ----

test('#118: the budget fails on a page that asks the kernel once per element (the way `quiet` did before run 0095)', async () => {
  const oneComputeEach = `{
    const original = quietReferencesThroughFacet;
    quietReferencesThroughFacet = function (kernel, facet) {
      treeQuietCache = null;
      for (const layer of ['application', 'technology']) for (const [reference] of AppState.index[layer]) kernel.compute(buildKernelInput('overview', reference, { layer, facet }).input);
      return original(kernel, facet);
    };
  }`;
  const small = await scenario(FIXTURES.small, { patch: oneComputeEach, until: 'first' });
  const large = await scenario(FIXTURES.large, { patch: oneComputeEach, until: 'first' });
  const problems = problemsOf(small, large, ['first']);
  assert.ok(
    problems.some((p) => /^first: compute is called \d+ times at 82 elements and \d+ times at 591 elements$/.test(p)),
    problems.join('\n')
  );
  assert.ok(
    large.steps.first.calls.compute > large.elements,
    'about one compute for each element: ' + large.steps.first.calls.compute
  );
});

test('#118: the budget fails on a list that reads every row for every row', async () => {
  const quadratic = `{
    const original = orderedChangeRows;
    orderedChangeRows = function (state) {
      const rows = original(state);
      for (const row of rows) rows.filter((other) => other.reference === row.reference && other.layer === row.layer);
      return rows;
    };
  }`;
  const small = await scenario(FIXTURES.small, { patch: quadratic });
  const large = await scenario(FIXTURES.large, { patch: quadratic });
  const problems = problemsOf(small, large, ['panel', 'walk']);
  assert.ok(
    problems.some((p) => /^panel: .* reads per row/.test(p)),
    problems.join('\n')
  );
  assert.ok(
    problems.some((p) => /^walk: .* reads per row/.test(p)),
    problems.join('\n')
  );
});

test('#118: the comparison of the two sizes says nothing about a page that holds, and tells a count that differs', () => {
  const same = { compute: 1, quiet: 2, compare: 0, applyPatches: 0 };
  assert.deepEqual(callsDiffer('x', same, Object.assign({}, same)), []);
  assert.equal(callsDiffer('x', same, Object.assign({}, same, { quiet: 3 })).length, 1);
  const a = { rowReads: 100, tableReads: 10 };
  assert.deepEqual(
    readsGrow('x', a, { rowReads: 800, tableReads: 80 }, 10, 80),
    [],
    'eight times the rows, eight times the reads'
  );
  assert.equal(
    readsGrow('x', a, { rowReads: 6400, tableReads: 640 }, 10, 80).length,
    1,
    'eight times the rows, sixty-four times the reads'
  );
});

test('#125: the time budget tells a call that grows with the square of the elements, and holds for one that grows with the elements', () => {
  const steps = (ms) => ({ first: { kernelMs: { quiet: ms } }, draw: { kernelMs: { applyPatches: ms } } });
  const small = { steps: steps(10) };
  assert.deepEqual(
    TIME_BUDGET.flatMap((budget) => timeProblems(budget, small, { steps: steps(80) })),
    [],
    'eight times the time for 7.2 times the elements'
  );
  assert.equal(
    TIME_BUDGET.flatMap((budget) => timeProblems(budget, small, { steps: steps(190) })).length,
    2,
    'nineteen times: both entries are told'
  );
  assert.deepEqual(
    TIME_BUDGET.flatMap((budget) => timeProblems(budget, { steps: steps(40) }, { steps: steps(300) })),
    [],
    'a slow machine is not a page that grows: only the ratio is judged'
  );
  assert.equal(
    TIME_BUDGET.flatMap((budget) => timeProblems(budget, { steps: steps(0) }, { steps: steps(10) })).length,
    2,
    'a step that made no call is not a pass'
  );
});
