'use strict';
// A rename and a move follow the `links` and the `highlight` of a Map view as they follow `pinned` (wave 026, run 0199, issue #143, TDD DEC-10, REQ-4): the source and the destination of every entry
// are rewritten in the saved views and in the steps that carry their own recipe, in one pass with the lists, the live choice of the page follows, the preview of a Move counts the views and
// the steps that carry an entry, the dialog of the plateaus beside names the views that would lose an entry, a label never changes, and another layer is left alone. The four ways of a Move
// (a header, inline, paste and extract) are each tried. Everything here is invented (a bakery, a shop, a delivery service and a company); the dialog of the sibling plateaus runs on the layered Brightcart.
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
const ALL = [GAUGE, TIMER, HQ, OVEN];

const yamlEntries = (list, indent = 6) =>
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
const VIEW = manifest(
  'view',
  null,
  [
    '  id: "bakery_links"',
    '  name: "Bakery links"',
    '  viewpoint: "map"',
    '  layer: "application"',
    '  properties:',
    '    opened: ["bakery", "bakery.oven"]',
    '    links:',
    yamlEntries(ALL),
    '    highlight:',
    yamlEntries(ALL),
    ''
  ].join('\n')
);
const VIEW_LINKS_ONLY = manifest(
  'view',
  null,
  [
    '  id: "only_links"',
    '  name: "Only links"',
    '  viewpoint: "map"',
    '  layer: "application"',
    '  properties:',
    '    links:',
    yamlEntries([OVEN]),
    ''
  ].join('\n')
);
const STORY = manifest(
  'story',
  null,
  [
    '  id: "tour"',
    '  name: "Tour"',
    '  steps:',
    '    - viewpoint: "map"',
    '      layer: "application"',
    '      properties:',
    '        links:',
    yamlEntries([OVEN], 8),
    '        highlight:',
    yamlEntries([OVEN], 8),
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
  'manifests/view.bakery_links.yaml': VIEW,
  'manifests/view.only_links.yaml': VIEW_LINKS_ONLY,
  'manifests/story.tour.yaml': STORY
};

async function open() {
  const opened = await openLayered(createApp, memFolder, FILES, {});
  assert.equal(opened.state.fatalError, null);
  return opened;
}

const keys = (_sandbox, list) =>
  list.map((e) => JSON.stringify([e.source, e.destination, (e.label || '').trim()])).sort();
const links = (sandbox, id) => plain(sandbox.findSavedView(id).properties.links);
const highlight = (sandbox, id) => plain(sandbox.findSavedView(id).properties.highlight);
const stepProperties = (sandbox) => plain(run(sandbox, "findStory('tour').steps[0].properties"));
const retargeted = (list, from, to) =>
  list.map((e) => ({
    source: e.source === from || e.source.startsWith(from + '.') ? to + e.source.slice(from.length) : e.source,
    destination:
      e.destination === from || e.destination.startsWith(from + '.')
        ? to + e.destination.slice(from.length)
        : e.destination,
    label: e.label
  }));

/** The form of the element as the page reads it, with the id typed, then the save the form does (`commitElementWithDraft`), as the rename-siblings tests do. */
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

test('the fixture opens, and every entry names a relationship before anything moves', async () => {
  const { sandbox } = await open();
  assert.equal(sandbox.viewProblem(sandbox.findSavedView('bakery_links')), null);
  assert.equal(sandbox.viewProblem(sandbox.findSavedView('only_links')), null);
  assert.deepEqual(links(sandbox, 'bakery_links').length, 4);
});

// ============================================================ rename

test('a rename of a destination rewrites the entries that name it, in links and in highlight, in a view and in a step', async () => {
  const { sandbox } = await open();
  rename(sandbox, 'bakery.oven.timer', 'clock');
  assert.ok(sandbox.__state().index.application.has('bakery.oven.clock'), 'the element was renamed');
  const expected = retargeted(ALL, 'bakery.oven.timer', 'bakery.oven.clock');
  assert.deepEqual(keys(sandbox, links(sandbox, 'bakery_links')), keys(sandbox, expected));
  assert.deepEqual(keys(sandbox, highlight(sandbox, 'bakery_links')), keys(sandbox, expected));
  assert.equal(
    sandbox.viewProblem(sandbox.findSavedView('bakery_links')),
    null,
    'the entries still name relationships: the model followed too'
  );
});

test('a rename of a parent rewrites every entry below it, the label never changes, and the view and the step keep drawing', async () => {
  const { sandbox } = await open();
  rename(sandbox, 'bakery', 'boulangerie');
  assert.deepEqual(
    keys(sandbox, links(sandbox, 'bakery_links')),
    keys(sandbox, retargeted(ALL, 'bakery', 'boulangerie'))
  );
  assert.deepEqual(
    keys(sandbox, highlight(sandbox, 'bakery_links')),
    keys(sandbox, retargeted(ALL, 'bakery', 'boulangerie'))
  );
  assert.deepEqual(links(sandbox, 'only_links'), retargeted([OVEN], 'bakery', 'boulangerie'));
  assert.deepEqual(stepProperties(sandbox).links, retargeted([OVEN], 'bakery', 'boulangerie'));
  assert.deepEqual(stepProperties(sandbox).highlight, retargeted([OVEN], 'bakery', 'boulangerie'));
  assert.deepEqual(
    links(sandbox, 'bakery_links')
      .map((e) => e.label)
      .sort(),
    ALL.map((e) => e.label).sort()
  );
  assert.equal(sandbox.viewProblem(sandbox.findSavedView('only_links')), null);
});

test('a rename marks the views and the story it rewrote as modified, and the save writes their files only for what changed', async () => {
  const { sandbox, state, mem } = await open();
  rename(sandbox, 'shop.till', 'counter');
  const dirty = state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath);
  assert.ok(dirty.includes('manifests/view.bakery_links.yaml'), 'a view that names the till in links');
  assert.ok(!dirty.includes('manifests/view.only_links.yaml'), 'a view that does not');
  assert.ok(!dirty.includes('manifests/story.tour.yaml'), 'a story that does not');
  await sandbox.saveAllChanges();
  const text = mem.files.get('manifests/view.bakery_links.yaml').text;
  assert.match(
    text,
    /\{source: "shop\.counter", destination: "bakery\.oven\.timer", label: "asks"\}/,
    'the entry as it was written, with its new source'
  );
  assert.match(text, /highlight:[\s\S]*\{source: "shop\.counter"/, 'and in the highlight');
});

test('the live choice of the page follows a rename like a pin does', async () => {
  const { sandbox } = await open();
  run(sandbox, 'mapLinks = ' + JSON.stringify([GAUGE, OVEN]) + '; mapPinned = ["bakery.oven"];');
  rename(sandbox, 'bakery.oven', 'furnace');
  assert.deepEqual(plain(run(sandbox, 'mapPinned')), ['bakery.furnace']);
  assert.deepEqual(
    keys(sandbox, plain(run(sandbox, 'mapLinks'))),
    keys(sandbox, retargeted([GAUGE, OVEN], 'bakery.oven', 'bakery.furnace'))
  );
});

test('a rename in the other layer leaves the entries of a Map of the application layer alone', async () => {
  const { sandbox } = await open();
  const recipe = {
    viewpoint: 'map',
    layer: 'application',
    properties: { links: [JSON.parse(JSON.stringify(GAUGE))], highlight: [JSON.parse(JSON.stringify(GAUGE))] }
  };
  sandbox.__recipe = recipe;
  assert.equal(run(sandbox, "rewriteRecipeReferences(__recipe, 'bakery', 'boulangerie', 'technology')"), false);
  assert.deepEqual(plain(recipe.properties.links), [GAUGE]);
  assert.equal(run(sandbox, "rewriteRecipeReferences(__recipe, 'bakery', 'boulangerie', 'application')"), true);
  assert.equal(recipe.properties.links[0].destination, 'boulangerie.oven.gauge');
  assert.equal(recipe.properties.highlight[0].destination, 'boulangerie.oven.gauge');
  // the Map of the technology layer reads no links: a recipe of that layer is not rewritten for its links
  const tech = { viewpoint: 'map', layer: 'technology', properties: { links: [JSON.parse(JSON.stringify(GAUGE))] } };
  sandbox.__tech = tech;
  assert.equal(run(sandbox, "rewriteRecipeReferences(__tech, 'bakery', 'boulangerie', 'application')"), false);
});

test('a recipe without links or highlight is rewritten exactly as before', async () => {
  const { sandbox } = await open();
  sandbox.__recipe = {
    viewpoint: 'map',
    layer: 'application',
    properties: { pinned: ['bakery.oven'], opened: ['bakery'] }
  };
  assert.equal(run(sandbox, "rewriteRecipeReferences(__recipe, 'bakery', 'boulangerie', 'application')"), true);
  assert.deepEqual(plain(sandbox.__recipe.properties), { pinned: ['boulangerie.oven'], opened: ['boulangerie'] });
  sandbox.__empty = { viewpoint: 'map', layer: 'application', properties: { links: [] } };
  assert.equal(run(sandbox, "rewriteRecipeReferences(__empty, 'bakery', 'boulangerie', 'application')"), false);
});

// ============================================================ move

const MOVES = [
  // [the way, the element, the new parent, the new reference]
  ['inline', 'bakery.oven.gauge', 'bakery.mixer', 'bakery.mixer.gauge'],
  ['header', 'shop.till', 'delivery', 'delivery.till'],
  ['paste', 'bakery.oven', 'delivery', 'delivery.oven'],
  ['extract', 'corp.hq', null, 'hq']
];

for (const [way, reference, parent, moved] of MOVES) {
  test(
    'a move that is written ' +
      way +
      ' rewrites links and highlight in the views and the steps, and the entries still name relationships',
    async () => {
      const { sandbox } = await open();
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
      const result = sandbox.commitMoveElement(
        reference,
        'application',
        parent === null ? run(sandbox, 'MOVE_TOP_LEVEL') : parent
      );
      assert.equal(result.ok, true, result.message);
      assert.equal(result.reference, moved);
      const expected = retargeted(ALL, reference, moved);
      assert.deepEqual(keys(sandbox, links(sandbox, 'bakery_links')), keys(sandbox, expected), 'links');
      assert.deepEqual(keys(sandbox, highlight(sandbox, 'bakery_links')), keys(sandbox, expected), 'highlight');
      assert.deepEqual(links(sandbox, 'only_links'), retargeted([OVEN], reference, moved));
      assert.deepEqual(
        stepProperties(sandbox).links,
        retargeted([OVEN], reference, moved),
        'the step with its own recipe'
      );
      assert.equal(sandbox.viewProblem(sandbox.findSavedView('bakery_links')), null);
      assert.equal(sandbox.viewProblem(sandbox.findSavedView('only_links')), null);
    }
  );
}

test('after a move and a save, the files hold the new references in links and highlight and the editor reads them again', async () => {
  const { sandbox, mem } = await open();
  assert.equal(sandbox.commitMoveElement('bakery.oven', 'application', 'delivery').ok, true);
  await sandbox.saveAllChanges();
  const text = mem.files.get('manifests/view.bakery_links.yaml').text;
  assert.equal((text.match(/delivery\.oven\.gauge/g) || []).length, 2, 'links and highlight');
  assert.doesNotMatch(text, /bakery\.oven\b/);
  const again = createApp({});
  const state = again.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await again.loadWorkspace(mem.handle);
  await again.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  assert.equal(again.viewProblem(again.findSavedView('bakery_links')), null);
});

test('the preview of a move counts the views and the steps that carry an entry, which only links and highlight name', async () => {
  const { sandbox } = await open();
  const plan = run(sandbox, "validateMove('delivery.van', 'application', 'shop')");
  assert.equal(plan.valid, true, plan.error);
  // `bakery_links` (links and highlight), `only_links` and the step of the story all name delivery.van, and none of them pins, hides or opens it
  assert.equal(plan.plan.references.views, 3);
  const none = run(sandbox, "validateMove('shop.till', 'application', 'delivery')");
  assert.equal(none.plan.references.views, 1, 'one view names the till: the others are not counted');
});

test('what a recipe names, for the dialog of the plateaus beside, includes the ends of links and highlight', async () => {
  const { sandbox } = await open();
  sandbox.__recipe = {
    viewpoint: 'map',
    layer: 'application',
    properties: { pinned: ['a'], links: [entry('b', 'c', 'x')], highlight: [entry('d', 'e')] }
  };
  const named = plain(run(sandbox, "recipeNamedReferences(__recipe, 'application')"));
  assert.deepEqual(named.slice().sort(), ['a', 'b', 'c', 'd', 'e']);
  sandbox.__other = { viewpoint: 'map', layer: 'technology', properties: { links: [entry('b', 'c', 'x')] } };
  assert.deepEqual(plain(run(sandbox, "recipeNamedReferences(__other, 'application')")), []);
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

test('the dialog of the plateaus beside names a view whose links alone name the element', async () => {
  // `saas` and `inhouse` do not stack; both have `commerce` once `saas` declares it too
  const page = await openWorkspace(BRIGHTCART, 'inhouse', {
    'saas/application/commerce.yaml': system('commerce', 'saas')
  });
  const view = page.sandbox.createManifestEntry('view', {
    id: 'commerce_links',
    name: 'Commerce links',
    viewpoint: 'map',
    layer: 'application',
    properties: { links: [entry('commerce', 'psp', 'authorises payments with')] }
  });
  const kept = page.sandbox.createManifestEntry('view', {
    id: 'highlight_only',
    name: 'Highlight only',
    viewpoint: 'map',
    layer: 'application',
    properties: { highlight: [entry('commerce', 'psp', 'authorises payments with')] }
  });
  const impact = plain(run(page.sandbox, "renameSiblingImpact('commerce', 'billing', 'application')"));
  assert.ok(impact, 'a plateau keeps the old reference');
  const named = impact.views.map((v) => v.id);
  assert.ok(named.includes(view.id), 'links: ' + named);
  assert.ok(named.includes(kept.id), 'and a highlight, which is rewritten too: ' + named);
});
