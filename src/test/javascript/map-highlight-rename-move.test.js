'use strict';
// A rename and a move follow the step's own `highlight` key (wave 026, run 0200, issue #143, TDD DEC-7 and DEC-5, REQ-5): the key of a step lives beside `view:` or the recipe, not in
// `properties`, so run 0199's rewrite never reached it. Here the source and the destination of every entry of a step's `highlight` are rewritten for a step with a view and for a step
// with its own recipe, in the four ways of a Move, the preview of a Move counts a step that only its key names, the dialog of the plateaus beside lists it, one helper yields the entry
// lists of a recipe and of a step for both functions (so they cannot get out of step), and the story editor's field edits the place *Add to story...* wrote (F1). RED until the editor does it.
// Everything is invented (a bakery, a shop, a delivery service and a company).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./viewpoint-kernel/harness');
const { memFolder } = require('./viewpoint-kernel/mem-folder');
const { openLayered } = require('./viewpoint-kernel/layered-folders');
const { BRIGHTCART, entry, run, plain, openWorkspace } = require('./map-links-support');

const manifest = (kind, parent, body) =>
  'header:\n  kind: "archicode.morin.io/' +
  kind +
  '"\n' +
  (parent ? '  parent: "' + parent + '"\n' : '') +
  '  version: "1"\ncontent:\n' +
  body;

const BAKERY = manifest(
  'system',
  null,
  [
    '  id: "bakery"',
    '  name: "Bakery"',
    '  elements:',
    '    - kind: container',
    '      id: "oven"',
    '      name: "Oven"',
    '      elements:',
    '        - kind: component',
    '          id: "gauge"',
    '          name: "Gauge"',
    '        - kind: component',
    '          id: "timer"',
    '          name: "Timer"',
    '    - kind: container',
    '      id: "mixer"',
    '      name: "Mixer"',
    '      relationships:',
    '        - destination: "bakery.oven.gauge"',
    '          label: "checks"',
    ''
  ].join('\n')
);
const SHOP = manifest('system', null, '  id: "shop"\n  name: "Shop"\n');
const TILL = manifest(
  'container',
  'shop',
  '  id: "till"\n  name: "Till"\n  relationships:\n    - destination: "bakery.oven.timer"\n      label: "asks"\n'
);
const DELIVERY = manifest('system', null, '  id: "delivery"\n  name: "Delivery"\n');
const VAN = manifest(
  'container',
  'delivery',
  '  id: "van"\n  name: "Van"\n  relationships:\n    - destination: "bakery.oven"\n      label: "collects from"\n'
);
const CORP = manifest(
  'solution',
  null,
  [
    '  id: "corp"',
    '  name: "Corp"',
    '  elements:',
    '    - kind: system',
    '      id: "hq"',
    '      name: "Head office"',
    '      relationships:',
    '        - destination: "bakery.mixer"',
    '          label: "feeds"',
    ''
  ].join('\n')
);

const GAUGE = entry('bakery.mixer', 'bakery.oven.gauge', 'checks');
const TIMER = entry('shop.till', 'bakery.oven.timer', 'asks');
const HQ = entry('corp.hq', 'bakery.mixer', 'feeds');
const OVEN = entry('delivery.van', 'bakery.oven', 'collects from');

const yamlEntries = (list, indent) =>
  list
    .map(
      (e) =>
        ' '.repeat(indent) +
        '- {source: "' +
        e.source +
        '", destination: "' +
        e.destination +
        '", label: "' +
        e.label +
        '"}'
    )
    .join('\n');
// a view with a highlight of its own (run 0199's case), and the story of this run: two steps, one with a view, one with its own recipe, each with the step key
const VIEW = manifest(
  'view',
  null,
  [
    '  id: "bakery_view"',
    '  name: "Bakery"',
    '  viewpoint: "map"',
    '  layer: "application"',
    '  properties:',
    '    opened: ["bakery"]',
    '    links:',
    yamlEntries([GAUGE, TIMER, HQ, OVEN], 6),
    ''
  ].join('\n')
);
const FLOW = manifest(
  'story',
  null,
  [
    '  id: "flow"',
    '  name: "Flow"',
    '  steps:',
    '    - view: "bakery_view"',
    '      highlight:',
    yamlEntries([OVEN, GAUGE, HQ], 8),
    '    - viewpoint: "map"',
    '      layer: "application"',
    '      properties:',
    '        links:',
    yamlEntries([OVEN, GAUGE, TIMER, HQ], 10),
    '      highlight:',
    yamlEntries([TIMER], 8),
    ''
  ].join('\n')
);
const FILES = {
  '.archicode.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n',
  'manifests/app.bakery.yaml': BAKERY,
  'manifests/app.shop.yaml': SHOP,
  'manifests/app.shop.till.yaml': TILL,
  'manifests/app.delivery.yaml': DELIVERY,
  'manifests/app.delivery.van.yaml': VAN,
  'manifests/app.corp.yaml': CORP,
  'manifests/view.bakery_view.yaml': VIEW,
  'manifests/story.flow.yaml': FLOW
};

async function open() {
  const opened = await openLayered(createApp, memFolder, FILES, {});
  assert.equal(opened.state.fatalError, null);
  return opened;
}
const keys = (list) => list.map((e) => JSON.stringify([e.source, e.destination, (e.label || '').trim()])).sort();
const stepKey = (sandbox, i) => plain(run(sandbox, 'findStory("flow").steps[' + i + '].highlight'));
const stepLinks = (sandbox) => plain(run(sandbox, 'findStory("flow").steps[1].properties.links'));
const retargeted = (list, from, to) =>
  list.map((e) => {
    const move = (ref) => (ref === from || ref.startsWith(from + '.') ? to + ref.slice(from.length) : ref);
    return { source: move(e.source), destination: move(e.destination), label: e.label };
  });

function rename(sandbox, reference, id) {
  const record = sandbox.findElementRecord(reference, 'application');
  const byId = {
    'edit-id-input': { value: id },
    'edit-name-input': { value: record.name === null ? '' : String(record.name) },
    'edit-description-input': { value: record.description === null ? '' : String(record.description) }
  };
  const doc = sandbox.document;
  const original = { getElementById: doc.getElementById, querySelectorAll: doc.querySelectorAll };
  doc.getElementById = (name) => byId[name] || original.getElementById.call(doc, name);
  doc.querySelectorAll = (selector) =>
    selector.includes('relationship-edit-row') ? [] : original.querySelectorAll.call(doc, selector);
  try {
    return sandbox.commitElementWithDraft(reference, null);
  } finally {
    Object.assign(doc, original);
  }
}

test('the story opens, and every key of a step names a relationship before anything moves', async () => {
  const { sandbox } = await open();
  assert.equal(stepKey(sandbox, 0).length, 3);
  assert.equal(stepKey(sandbox, 1).length, 1);
  assert.equal(run(sandbox, 'stepProblem(findStory("flow").steps[0])'), null);
  assert.equal(run(sandbox, 'stepProblem(findStory("flow").steps[1])'), null);
});

test('a rename rewrites the key of a step with a view and of a step with its own recipe, the label never changes', async () => {
  const { sandbox } = await open();
  rename(sandbox, 'bakery', 'boulangerie');
  assert.deepEqual(keys(stepKey(sandbox, 0)), keys(retargeted([OVEN, GAUGE, HQ], 'bakery', 'boulangerie')));
  assert.deepEqual(keys(stepKey(sandbox, 1)), keys(retargeted([TIMER], 'bakery', 'boulangerie')));
  assert.deepEqual(keys(stepLinks(sandbox)), keys(retargeted([OVEN, GAUGE, TIMER, HQ], 'bakery', 'boulangerie')));
  assert.equal(run(sandbox, 'stepProblem(findStory("flow").steps[0])'), null, 'the step still draws');
  assert.equal(run(sandbox, 'stepProblem(findStory("flow").steps[1])'), null);
});

test('the story is marked modified by a rename that only its key names', async () => {
  const { sandbox, mem } = await open();
  rename(sandbox, 'corp.hq', 'board'); // only the second step names it, and only in `links`; the key of the first step names the oven
  rename(sandbox, 'delivery.van', 'truck'); // names the key of both steps and the links of the second
  await sandbox.saveAllChanges();
  const text = mem.files.get('manifests/story.flow.yaml').text;
  assert.doesNotMatch(text, /delivery\.van/);
  assert.match(text, /delivery\.truck/);
});

const MOVES = [
  ['inline', 'bakery.oven.gauge', 'bakery.mixer', 'bakery.mixer.gauge'],
  ['header', 'shop.till', 'delivery', 'delivery.till'],
  ['paste', 'bakery.oven', 'delivery', 'delivery.oven'],
  ['extract', 'corp.hq', null, 'hq']
];
for (const [way, reference, parent, moved] of MOVES) {
  test('a move written ' + way + ' rewrites the key of the steps, for a view step and an own-recipe step', async () => {
    const { sandbox } = await open();
    const target = parent === null ? run(sandbox, 'MOVE_TOP_LEVEL') : parent;
    const plan = run(
      sandbox,
      'validateMove(' +
        JSON.stringify(reference) +
        ", 'application', " +
        (parent === null ? 'MOVE_TOP_LEVEL' : JSON.stringify(parent)) +
        ')'
    );
    assert.equal(plan.valid, true, plan.error);
    assert.equal(plan.plan.route, way);
    const result = sandbox.commitMoveElement(reference, 'application', target);
    assert.equal(result.ok, true, result.message);
    assert.deepEqual(keys(stepKey(sandbox, 0)), keys(retargeted([OVEN, GAUGE, HQ], reference, moved)), 'step 1');
    assert.deepEqual(keys(stepKey(sandbox, 1)), keys(retargeted([TIMER], reference, moved)), 'step 2');
    assert.equal(run(sandbox, 'stepProblem(findStory("flow").steps[0])'), null);
    assert.equal(run(sandbox, 'stepProblem(findStory("flow").steps[1])'), null);
  });
}

test('the preview of a move counts a step whose key alone names the element', async () => {
  const { sandbox } = await open();
  // a story whose only mention of the till is the key of a step that points at a view which does not name it
  sandbox.createManifestEntry('story', {
    id: 'solo',
    name: 'Solo',
    steps: [{ view: 'bakery_view', highlight: [TIMER] }]
  });
  const before = run(sandbox, "validateMove('shop.till', 'application', 'delivery')").plan.references.views;
  sandbox.findStory('solo').steps[0].highlight = [OVEN];
  const after = run(sandbox, "validateMove('shop.till', 'application', 'delivery')").plan.references.views;
  assert.equal(before - after, 1, 'the step with the till in its key counts, the one without does not');
});

test('the dialog of the plateaus beside lists a view step and an own-recipe step whose key alone names the element, in one pass', async () => {
  const page = await openWorkspace(BRIGHTCART, 'inhouse', {
    'saas/application/commerce.yaml': system('commerce', 'saas')
  });
  const psp = entry('commerce', 'psp', 'authorises payments with');
  page.sandbox.createManifestEntry('view', {
    id: 'plain_map',
    name: 'Plain map',
    viewpoint: 'map',
    layer: 'application',
    properties: {}
  });
  page.sandbox.createManifestEntry('story', {
    id: 'both_forms',
    name: 'Both forms',
    steps: [
      { view: 'plain_map', highlight: [psp] },
      { viewpoint: 'map', layer: 'application', properties: {}, highlight: [psp] }
    ]
  });
  const impact = plain(run(page.sandbox, "renameSiblingImpact('commerce', 'billing', 'application')"));
  const numbers = impact.steps.filter((s) => s.story === 'both_forms').map((s) => s.number);
  assert.deepEqual(numbers, [1, 2], JSON.stringify(impact.steps));
});

test('the story editor field of a step edits the key that Add to story wrote, never a second place', async () => {
  const { sandbox } = await open();
  run(sandbox, 'mapLinks = ' + JSON.stringify([GAUGE, TIMER]) + '; mapHighlight = ' + JSON.stringify([GAUGE]) + ';');
  sandbox.addCurrentViewToStoryChoice({ newName: 'Fresh' });
  const story = plain(run(sandbox, "storiesList().find((s) => s.name === 'Fresh')"));
  const step = story.steps[0];
  assert.deepEqual(keys(step.highlight), keys([GAUGE]), 'the step key');
  assert.equal('highlight' in (step.properties || {}), false, 'not in properties');
  assert.deepEqual(keys(step.properties.links), keys([GAUGE, TIMER]));
  assert.equal(sandbox.setStepHighlight(story.id, 0, TIMER, true), true);
  const after = plain(run(sandbox, 'findStory(' + JSON.stringify(story.id) + ').steps[0]'));
  assert.deepEqual(keys(after.highlight), keys([GAUGE, TIMER]));
  assert.equal('highlight' in after.properties, false, 'still one place');
});

// ============================================================ the plateaus beside

const system = (id, plateau) =>
  'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n  plateau: "' +
  plateau +
  '"\ncontent:\n  id: "' +
  id +
  '"\n  name: "' +
  id +
  ' of ' +
  plateau +
  '"\n';

test('the dialog of the plateaus beside names a story whose step key alone names the element', async () => {
  const page = await openWorkspace(BRIGHTCART, 'inhouse', {
    'saas/application/commerce.yaml': system('commerce', 'saas')
  });
  page.sandbox.createManifestEntry('story', {
    id: 'key_only',
    name: 'Key only',
    steps: [
      {
        viewpoint: 'map',
        layer: 'application',
        properties: {},
        highlight: [entry('commerce', 'psp', 'authorises payments with')]
      }
    ]
  });
  const impact = plain(run(page.sandbox, "renameSiblingImpact('commerce', 'billing', 'application')"));
  assert.ok(impact, 'a plateau keeps the old reference');
  assert.ok(
    impact.steps.some((s) => s.story === 'key_only'),
    'the story is named: ' + JSON.stringify(impact.steps)
  );
});
