'use strict';
// Wave 027, run 0202 (W-2, issue #178), TDD DEC-3, CTR-2, VER-1, REQ-3 and REQ-7: `buildElkGraph(result, options)` is the only place that knows the ELK keys of the layer bound. With
// `options.columns` set it adds `elk.layered.layering.strategy: COFFMAN_GRAHAM` and `elk.layered.layering.coffmanGraham.layerBound: String(columns)` to the layout options of the root and of
// EVERY node that has children (the spike: on the root alone the containers ignore the bound), and to no leaf; with no `columns` it adds nothing, and the graph is today's, key for key.
// ELK cannot run in Node (CON-5), so the tests judge the graph handed to it. The reference for "today's" is the body of the function as it was before the run (diagram-columns-reference.js, copied
// from the commit that precedes it) run inside the same page on the same input. The saved Maps are those of the contracts the command line and the editor share
// (technology-map/expected-boxes.json and map-links/expected-boxes.json): with no `layout`, the graph equals the reference and the boxes drawn equal the contract.
// Written first, red: the page does not set the keys yet. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BUILD_ELK_GRAPH } = require('./diagram-columns-reference');
const {
  REPO,
  CONTRACT: LINKS_CONTRACT,
  run,
  addMapView,
  openViewPage,
  boxIdsOf,
  openWorkspace
} = require('../map-links-support');
const { startPage } = require('./library-page');

const TECHNOLOGY_CONTRACT = JSON.parse(
  fs.readFileSync(path.join(REPO, 'src/test/resources/technology-map/expected-boxes.json'), 'utf8')
);
const STRATEGY = 'elk.layered.layering.strategy';
const BOUND = 'elk.layered.layering.coffmanGraham.layerBound';
// through JSON: the page is another realm, its objects are not equal to ours by prototype
const plain = (value) => JSON.parse(JSON.stringify(value));

/** Every call of `buildElkGraph` the page makes from now on: the kernel's answer, the options and the graph it gave. */
function recordGraphs(sandbox) {
  run(
    sandbox,
    `globalThis.__elkCalls = [];
     (function () {
       const real = buildElkGraph;
       buildElkGraph = function (result, options) {
         const graph = real(result, options);
         globalThis.__elkCalls.push({ result, options, graph });
         return graph;
       };
     })();`
  );
  return () => run(sandbox, '__elkCalls');
}

/** The reference function, evaluated in the page next to the new one. */
const referenceIn = (sandbox) => run(sandbox, '(' + BUILD_ELK_GRAPH + ')');

/** Every node of a graph with its path of ids, root first. */
function nodesOf(graph) {
  const out = [];
  const walk = (node, ancestry) => {
    out.push({ node, ancestry });
    for (const child of node.children || []) walk(child, ancestry.concat(node.id));
  };
  walk(graph, []);
  return out;
}

/** The graph without the two layering keys (an empty `layoutOptions` stays, so only the keys go). */
function withoutBound(graph) {
  const copy = plain(graph);
  for (const { node } of nodesOf(copy)) {
    if (!node.layoutOptions) continue;
    delete node.layoutOptions[STRATEGY];
    delete node.layoutOptions[BOUND];
  }
  return copy;
}

/** The saved Maps of the technology contract (the layer Environments) and of the map-links contract that the command line draws. */
function savedMaps() {
  const maps = [];
  for (const entry of TECHNOLOGY_CONTRACT.workspaces)
    for (const [id, expected] of Object.entries(entry.views))
      maps.push({ kind: 'technology', dir: path.join(REPO, entry.workspace), id, expected, plateau: expected.plateau });
  for (const entry of LINKS_CONTRACT.workspaces)
    for (const [id, c] of Object.entries(entry.cases))
      if (c.drawn && !c.step && c.plateau === 'baseline' && !c.against && !c.facet)
        maps.push({ kind: 'links', dir: path.join(REPO, entry.workspace), id, expected: c, plateau: c.plateau });
  return maps;
}

/** Opens the page of a saved Map of a contract and draws it; returns the page and the graphs the page built. */
async function drawMap(map) {
  let page;
  let view;
  if (map.kind === 'technology') {
    page = await startPage({ dir: map.dir, plateau: map.plateau });
    view = page.sandbox.findSavedView(map.id);
  } else {
    page = await openWorkspace(map.dir, map.plateau);
    view = addMapView(page, map.id, JSON.parse(JSON.stringify(map.expected.properties)));
  }
  const calls = recordGraphs(page.sandbox);
  await openViewPage(page, view);
  return { page, calls: Array.from(calls()) };
}

test('the saved Maps of the contracts are there to be drawn: both layers, a dozen maps at least', () => {
  const maps = savedMaps();
  assert.ok(maps.some((m) => m.kind === 'technology'));
  assert.ok(maps.some((m) => m.kind === 'links'));
  assert.ok(maps.length >= 8, 'maps: ' + maps.length);
});

test('with no layout anywhere the graph handed to ELK is the reference graph, key for key, and `columns` is not an option', async () => {
  let compared = 0;
  for (const map of savedMaps()) {
    const { page, calls } = await drawMap(map);
    assert.ok(calls.length >= 1, map.id + ': the page built a graph');
    const reference = referenceIn(page.sandbox);
    for (const call of calls) {
      assert.deepEqual(plain(call.graph), plain(reference(call.result, call.options)), map.id + ': the graph');
      assert.ok(
        !call.options || call.options.columns === undefined || call.options.columns === null,
        map.id + ': no columns option without a layout'
      );
      for (const { node } of nodesOf(call.graph)) {
        const options = node.layoutOptions || {};
        assert.ok(!(STRATEGY in options) && !(BOUND in options), map.id + ': no layering key on ' + node.id);
      }
      compared++;
    }
    // REQ-7: and what is drawn is what the contract says
    const boxes = boxIdsOf(page.scene().html);
    assert.deepEqual(boxes, map.expected.boxes, map.id + ': the boxes of the contract');
  }
  assert.ok(compared >= 8, 'graphs compared: ' + compared);
});

test('with columns 4 the root and every node that has children carry the two keys, no leaf does, and nothing else of the graph moves', async () => {
  let compounds = 0;
  let leaves = 0;
  for (const map of savedMaps()) {
    const { page, calls } = await drawMap(map);
    const reference = referenceIn(page.sandbox);
    for (const call of calls) {
      const graph = page.sandbox.buildElkGraph(call.result, Object.assign({}, call.options, { columns: 4 }));
      for (const { node } of nodesOf(graph)) {
        const options = node.layoutOptions || {};
        const isRoot = node.id === 'root';
        if (isRoot || (node.children && node.children.length)) {
          assert.equal(options[STRATEGY], 'COFFMAN_GRAHAM', map.id + ': strategy on ' + node.id);
          assert.equal(options[BOUND], '4', map.id + ': bound on ' + node.id);
          if (!isRoot) compounds++;
        } else {
          assert.ok(!(STRATEGY in options) && !(BOUND in options), map.id + ': no key on the leaf ' + node.id);
          leaves++;
        }
      }
      assert.deepEqual(
        withoutBound(graph),
        plain(reference(call.result, call.options)),
        map.id + ': apart from the two keys, the graph is the reference'
      );
    }
  }
  assert.ok(compounds > 0, 'at least one compound node was drawn');
  assert.ok(leaves > 0, 'at least one leaf was drawn');
});

test('the bound is the number as text, whatever the number: 1, 7 and 20', async () => {
  const page = await openWorkspace(path.join(REPO, 'src/doc/examples/domain_plateaus'), 'baseline');
  const view = addMapView(page, 'm', { opened: ['shop'] });
  const calls = recordGraphs(page.sandbox);
  await openViewPage(page, view);
  const { result, options } = calls()[0];
  for (const columns of [1, 7, 20]) {
    const graph = page.sandbox.buildElkGraph(result, Object.assign({}, options, { columns }));
    assert.equal(graph.layoutOptions[BOUND], String(columns));
    assert.equal(graph.layoutOptions[STRATEGY], 'COFFMAN_GRAHAM');
  }
  // a null or an absent columns is no bound
  for (const columns of [null, undefined]) {
    const graph = page.sandbox.buildElkGraph(result, Object.assign({}, options, { columns }));
    assert.ok(!(BOUND in graph.layoutOptions));
  }
});

test("a saved Map with a layout reaches the layout engine bounded: the view's columns, then the workspace's, and the page says so on the graph it builds", async () => {
  const dir = path.join(REPO, 'src/doc/examples/domain_plateaus');
  const view = { opened: ['shop'], layout: { columns: 3 } };
  const page = await openWorkspace(dir, 'baseline');
  const saved = addMapView(page, 'wide', view);
  const calls = recordGraphs(page.sandbox);
  await openViewPage(page, saved);
  const graph = calls().at(-1).graph;
  assert.equal(graph.layoutOptions[BOUND], '3', 'the root');
  for (const { node } of nodesOf(graph).filter((entry) => entry.node.children && entry.node.children.length))
    assert.equal(node.layoutOptions[BOUND], '3', node.id);

  // the workspace level: no view value, `settings.views.properties.map.layout`
  const other = await openWorkspace(dir, 'baseline');
  other.state.workspace.settings.views.properties = { map: { layout: { columns: 2 } } };
  const plainMap = addMapView(other, 'plain', { opened: ['shop'] });
  const otherCalls = recordGraphs(other.sandbox);
  await openViewPage(other, plainMap);
  assert.equal(otherCalls().at(-1).graph.layoutOptions[BOUND], '2');
});
