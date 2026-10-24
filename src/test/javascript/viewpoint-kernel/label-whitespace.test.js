'use strict';
// A relationship label with spaces around it, or left empty, is the label the kernel compares (trimmed, an empty one being none): the
// editor draws the comparison, lists the changes and lets a facet select on `change` exactly as it does for the label without the spaces.
// The CLI side is PlateauComparisonTest.aLabelWithSpacesAroundItOrLeftEmptyIsTheLabelTheKernelCompares, on the same edits of the same fixture.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const FIXTURE = path.resolve(__dirname, '../../resources/plateau-comparison');
const EXPECTED = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'expected-counts.json'), 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value));

const folders = [];
test.after(() => folders.forEach((folder) => fs.rmSync(folder, { recursive: true, force: true })));

function replaceIn(folder, file, from, to) {
  const target = path.join(folder, file);
  const text = fs.readFileSync(target, 'utf8');
  assert.ok(text.includes(from), file + ' has no ' + from);
  fs.writeFileSync(target, text.replace(from, to));
}

/** The fixture of the CLI in a folder of its own, with spaces around three labels and one label left empty. */
function untidyFixture() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-labels-'));
  folders.push(folder);
  fs.cpSync(FIXTURE, folder, { recursive: true });
  replaceIn(
    folder,
    'plateaus/20_to-be/plateau.yaml',
    '    - operator: ADD\n      target: "customer"',
    '    - operator: SET\n      target: "shop.web"\n      field: relationships\n      where: {destination: "shop.api", label: "calls"}\n      value: {label: "calls "}\n    - operator: ADD\n      target: "customer"'
  );
  replaceIn(folder, 'plateaus/20_to-be/shop.mobile.yaml', 'label: "calls"', 'label: ""');
  replaceIn(folder, 'plateaus/20_to-be/plateau.yaml', 'label: "orders on"', 'label: "orders on "');
  replaceIn(folder, 'plateaus/10_as-is/shop.yaml', 'label: "delegates to"', 'label: "delegates to "');
  return folder;
}

async function open(folder) {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(folder);
  state.folder = { handle, name: 'plateau-comparison' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  await sandbox.loadViewpointKernel();
  await sandbox.drawPlateau(EXPECTED.plateau);
  await sandbox.compareWithPlateau(EXPECTED.baseline);
  return { sandbox, state };
}

test('spaces around a label, or an empty label, change nothing to the comparison: the same counts and the same table as without them', async () => {
  const { sandbox } = await open(untidyFixture());
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.problems, undefined);
  assert.deepEqual(plain(comparison.counts), EXPECTED.counts);
  const rows = (list) =>
    list.map((row) => [row.thing, row.layer, row.reference, row.destination || '', row.change].join('|'));
  assert.deepEqual(rows(plain(comparison.changes)), rows(EXPECTED.changes));
});

test('the union carries the labels the kernel compares, so that the drawing and a facet read the same words', async () => {
  const { sandbox } = await open(untidyFixture());
  const { input } = sandbox.buildKernelInput('map', '', { opened: ['shop'] });
  const rel = (from, destination) =>
    input.elements.find((e) => e.reference === from).relationships.find((r) => r.destination === destination);
  assert.equal(rel('customer', 'shop.mobile').label, 'orders on');
  assert.equal(rel('customer', 'shop.mobile').change, 'new');
  assert.equal(rel('shop.web', 'shop.api').label, 'calls');
  assert.equal(rel('shop.web', 'shop.api').change, 'none', 'the same relationship as in the baseline');
  assert.ok(rel('shop.mobile', 'shop.api').label === null || rel('shop.mobile', 'shop.api').label === undefined);
  assert.equal(rel('shop.mobile', 'shop.api').change, 'new');
  assert.equal(rel('shop.api', 'shop.legacy').label, 'delegates to');
  assert.equal(rel('shop.api', 'shop.legacy').change, 'removed');
});

test('a facet that selects on change sees the new relationship whose label has a space, and the others stay', async () => {
  const { sandbox } = await open(untidyFixture());
  const kernel = await sandbox.loadViewpointKernel();
  const facet = {
    name: 'without-new',
    actions: [{ operator: 'REMOVE', jsonPath: "$..relationships[?(@.change == 'new')]" }]
  };
  const ends = (options) =>
    kernel
      .compute(sandbox.buildKernelInput('map', '', Object.assign({ opened: ['shop'] }, options)).input)
      .links.map((link) => link.from + '>' + link.to);
  const all = ends({});
  const kept = ends({ facet });
  assert.ok(
    all.some((end) => end === 'customer>shop.mobile'),
    all.join(', ')
  );
  assert.ok(
    !kept.some((end) => end === 'customer>shop.mobile'),
    'new, with a space in its label: gone with the facet: ' + kept.join(', ')
  );
  assert.ok(!kept.some((end) => end === 'shop.mobile>shop.api'), 'new, with no label: gone too');
  assert.ok(
    kept.some((end) => end === 'customer>shop.web'),
    'the others stay'
  );
  assert.equal(
    kept.filter((end) => end === 'shop.api>shop.legacy').length,
    all.filter((end) => end === 'shop.api>shop.legacy').length,
    'the removed one is there once'
  );
});
