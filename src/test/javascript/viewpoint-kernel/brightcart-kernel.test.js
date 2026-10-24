'use strict';
// Brightcart (wave 012, run 0061): the kernel's `compare` on the layered rendition of the invented shopping solution, against the answers the document records
// (docs/fixtures/brightcart-spec.md, sections 10 and 11). Nothing here is typed from the document: the counts, the tables of changes and the notable cases are read from
// src/test/resources/brightcart/expected/ (written by generate.mjs), and the plateaus are read from src/test/resources/brightcart/layered/ through the editor's own loader
// (loadWorkspace, drawPlateau, toKernelElements) and the embedded module (`compare`, then `compute` for the state a box gets from what is below it). The Java side is in
// src/test/java/io/morin/archicode/brightcart/: `archicode diff` gives the same counts and the same table from the same files.
// Only the comparisons that the current tools can say are asserted (`verified: "archicode diff"`): P6 is the model's alone. P4 needs the composition of `replaces`, which the kernel does from `chain`, the plateaus between the two (wave 017, issue #89).
// The `deep` view of `inhouse` and `marketplace` against their baselines is drawn (E1 of the document, section 12, fixed by W-3 of wave 012): see "E1" below.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart');
const LAYERED = path.join(BRIGHTCART, 'layered');
const expected = (name) => JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'expected', name + '.json'), 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value));

const COMPARISONS = expected('comparisons');
const CHANGES = expected('changes');
const CASES = expected('notable-cases');
/** The comparisons a tool can say today: the others (P6) are the model's. */
const VERIFIED = COMPARISONS.filter((c) => c.verified === 'archicode diff');

let opened = null;
/** The editor on `layered/`, the kernel loaded, and the elements of each plateau as the editor sends them to the kernel. */
function brightcart() {
  if (!opened) {
    opened = (async () => {
      const sandbox = createApp();
      const state = sandbox.__state();
      const handle = makeDirHandle(LAYERED);
      state.folder = { handle, name: 'layered' };
      state.permissionState = 'granted';
      await sandbox.loadWorkspace(handle);
      assert.equal(state.fatalError, null);
      const kernel = await sandbox.loadViewpointKernel();
      const sides = {};
      for (const id of state.plateauTree.nodes.keys()) {
        sandbox.drawPlateau(id);
        assert.equal(state.fatalError, null, id);
        assert.equal(state.layers.current, id);
        sides[id] = plain({
          application: sandbox.toKernelElements(state.index.application, true).elements,
          technology: sandbox.toKernelElements(state.index.technology, true).elements
        });
      }
      return { sandbox, state, kernel, sides };
    })();
  }
  return opened;
}

/** A layer holds the elements it inherits with the `replaces` of the layer that declared them: the ones the base writes the same way are left out of the target, as the tools do (`PlateauComparer.carries`). */
function withoutInheritedReplaces(base, target) {
  const out = plain(target);
  for (const layer of ['application', 'technology']) {
    const known = new Map();
    for (const e of base[layer]) if (e.replaces) known.set(e.reference, JSON.stringify(e.replaces));
    for (const e of out[layer])
      if (e.replaces && JSON.stringify(e.replaces) === known.get(e.reference)) delete e.replaces;
  }
  return out;
}

async function compare(comparison) {
  const { kernel, sides } = await brightcart();
  // the plateaus from the base to the target; the ones in between are what the kernel composes the `replaces` from (`PlateauComparer.chain`, `replacesChainBetween`)
  const base = comparison.chain[0],
    target = comparison.chain[comparison.chain.length - 1];
  const input = { base: sides[base], target: withoutInheritedReplaces(sides[base], sides[target]), on_one_chain: true };
  if (comparison.chain.length > 2) input.chain = comparison.chain.slice(0, -1).map((id) => sides[id]);
  const out = plain(kernel.compare(input)); // plain objects of this realm
  assert.equal(out.error, undefined, comparison.id);
  return out;
}

const byId = (id) => COMPARISONS.find((c) => c.id === id);

// ---- the counts: the same as `archicode diff` prints ----

for (const comparison of VERIFIED) {
  test(comparison.id + ': compare gives the counts of ' + comparison.comparison, async () => {
    const out = await compare(comparison);
    const { elements, relationships } = out.counts;
    assert.deepEqual({ new: elements.new, changed: elements.changed, removed: elements.removed }, comparison.elements);
    // moved, split and merged are counted only when there is one: the kernel leaves them out of a comparison that has none
    assert.deepEqual(
      { moved: elements.moved || 0, split: elements.split || 0, merged: elements.merged || 0 },
      comparison.replacing
    );
    assert.deepEqual(plain(relationships), comparison.relationships);
    // what the kernel ignored in `replaces` (an element that is not in the base plateau) is the number the tool prints as warnings
    assert.equal(out.warnings ? out.warnings.length : 0, comparison.ignoredReplaces, comparison.id + ': warnings');
  });
}

test("the baseline of a comparison is the one the file says: P5 compares siblings, P4 is two steps apart and composed, P6 skips a plateau and is the model's", () => {
  assert.deepEqual(byId('P5').chain, ['saas', 'inhouse']);
  assert.deepEqual(byId('P4').chain, ['baseline', 'inhouse', 'marketplace']);
  assert.deepEqual(byId('P6').chain, ['baseline', 'marketplace']);
  assert.equal(
    byId('P6').verified,
    'model only',
    "what a tool that reads the last step's `replaces` alone would print: P4 is the answer of the tool, composed"
  );
  assert.equal(
    byId('P4').verified,
    'archicode diff',
    'the composed comparison is something the tools say (wave 017, issue #89)'
  );
});

// ---- the table of changes: element by element, relationship by relationship ----

for (const comparison of VERIFIED) {
  test(comparison.id + ': the table of changes is the one in expected/changes.json', async () => {
    const out = await compare(comparison);
    const want = CHANGES[comparison.id];
    // the states a box gets from what is below it (contains-changes) are the drawing's: the kernel's `compute` says them, see N13 below
    const wantElements = want.elements
      .filter((e) => e.state !== 'contains-changes')
      .map((e) => e.layer + '|' + e.ref + '|' + e.state)
      .sort();
    // a box that another one replaced and that stays in the union to hold what was below it (`shop`, replaced by `storefront`) is 'removed' with `replaced_by`: neither counted nor listed
    const gotElements = out.elements
      .filter((e) => e.change !== 'none' && !e.replaced_by)
      .map((e) => e.layer + '|' + e.reference + '|' + e.change)
      .sort();
    assert.deepEqual(gotElements, wantElements);

    const wantRelationships = want.relationships
      .map((r) => [r.layer, r.source, r.destination, r.label, r.state].join('|'))
      .sort();
    // a label change is one row `changed`, under the new label; the file keeps the label the relationship had (the model's `label-changed`)
    const labelBefore = new Map(
      out.changes
        .filter((c) => c.thing === 'relationship' && c.change === 'changed')
        .map((c) => [c.layer + '|' + c.reference + '|' + c.destination + '|' + c.label, c.before && c.before.label])
    );
    const gotRelationships = out.relationships
      .filter((r) => r.change !== 'none')
      .map((r) => {
        const before = labelBefore.get(r.layer + '|' + r.from + '|' + r.destination + '|' + r.label);
        const labelChanged = r.change === 'changed' && before !== undefined && before !== r.label;
        return [
          r.layer,
          r.from,
          r.destination,
          labelChanged ? before : r.label,
          labelChanged ? 'label-changed' : r.change
        ].join('|');
      })
      .sort();
    assert.deepEqual(gotRelationships, wantRelationships);
  });
}

// ---- the notable cases of section 10 that the kernel can show ----

/** The state of a thing, in the words of the file, as the kernel's `compare` says it. */
function stateOf(out, check) {
  if (check.relationship) {
    const [source, destination, label] = check.relationship;
    const row = out.changes.find(
      (c) =>
        c.thing === 'relationship' &&
        c.layer === (check.layer || 'application') &&
        c.reference === source &&
        c.destination === destination &&
        ((c.before && c.before.label) === label || c.label === label)
    );
    return row ? (row.change === 'changed' && row.natures.includes('label') ? 'label-changed' : row.change) : 'none';
  }
  const element = out.elements.find((e) => e.layer === check.layer && e.reference === check.ref);
  return element ? element.change : undefined;
}

for (const notable of CASES) {
  const checks = notable.checks.filter(
    (c) => byId(c.in).verified === 'archicode diff' && c.state !== 'contains-changes'
  );
  if (!checks.length) continue;
  test(notable.id + ': ' + notable.case + ' (' + notable.where.replace(/`/g, '') + ')', async () => {
    for (const check of checks) {
      const out = await compare(byId(check.in));
      const what = check.in + ' ' + (check.ref || check.relationship.join(' -> '));
      assert.equal(stateOf(out, check), check.state, what);
    }
  });
}

test("the notable cases name every case N1 to N17, and the ones that are not run are the model's or a variant", () => {
  assert.deepEqual(
    CASES.map((c) => c.id),
    Array.from({ length: 17 }, (_, i) => 'N' + (i + 1))
  );
  const skipped = CASES.flatMap((c) =>
    c.checks.filter((k) => byId(k.in).verified !== 'archicode diff').map((k) => c.id + ' in ' + k.in)
  );
  assert.deepEqual(skipped, ['N8 in P6'], 'only the question of P6, which the tool answers as P4, is not run here');
  assert.deepEqual(CASES.find((c) => c.id === 'N17').checks, [], 'N17 is variant V8, described and not run');
});

test('N6, N7: the relationships of a split element are not compared (all new), and the link between two merged elements reads as removed', async () => {
  const out = await compare(byId('P2'));
  const row = (change, reference, destination) =>
    out.relationships.find((r) => r.from === reference && r.destination === destination && r.change === change);
  for (const part of ['orders.placement', 'orders.history']) {
    const mine = out.relationships.filter((r) => r.from === part);
    assert.ok(mine.length > 0, part + ' has relationships');
    assert.ok(
      mine.every((r) => r.change === 'new'),
      part + ': ' + JSON.stringify(mine.map((r) => r.change))
    );
  }
  assert.ok(row('removed', 'accounts.profiles', 'accounts.profiles'), 'the self-link of the merge reads as removed');
});

test('N10, N12: the link follows the replaced destination and only its qualifier differs; the bulk edit sets the tag on 12 containers and five of them change by that alone', async () => {
  const out = await compare(byId('P3'));
  const link = out.changes.find(
    (c) => c.thing === 'relationship' && c.reference === 'commerce.checkout' && c.destination === 'fulfilment.inventory'
  );
  assert.equal(link.change, 'changed');
  assert.deepEqual(link.natures, ['qualifiers']);
  const tagged = out.elements.filter(
    (e) => e.layer === 'application' && e.tags && e.tags.runtime !== undefined && e.change !== 'removed'
  );
  assert.equal(tagged.length, 12, 'the guard `expect: 12` of the bulk edit');
  const onlyTheTag = out.changes.filter(
    (c) => c.thing === 'element' && c.change === 'changed' && c.natures.length === 1 && c.natures[0] === 'tags'
  );
  assert.equal(onlyTheTag.length, 5, onlyTheTag.map((c) => c.reference).join(', '));
});

// ---- N13: a box that has no change of its own and contains one ----

/** The stereotypes `compute` gives each box of the picture of a comparison: the states of the drawing. */
async function drawn(comparison, viewpoint, reference, layer) {
  const { sandbox, state, kernel } = await brightcart();
  sandbox.drawPlateau(comparison.chain[comparison.chain.length - 1]);
  // a click on the plateau already compared with ends the comparison: ask only when it is not the one made
  if (!(state.layers.compare && state.layers.compare.other === comparison.chain[0]))
    sandbox.compareWithPlateau(comparison.chain[0]);
  vm.runInContext("currentPerspective = 'map';", sandbox);
  const options = viewpoint === 'map' ? { opened: Array.from(state.index.application.keys()) } : { layer };
  const { input } = sandbox.buildKernelInput(viewpoint, reference, options);
  const result = kernel.compute(input);
  assert.equal(result.error, undefined, comparison.id + ' ' + viewpoint);
  return new Map(result.items.map((item) => [item.reference, item.stereotypes || []]));
}

test('N13: shop and prod.dc contain changes and have none of their own (the box says so in the drawing)', async () => {
  const n13 = CASES.find((c) => c.id === 'N13');
  const want = n13.checks.filter((c) => c.state === 'contains-changes' && byId(c.in).verified === 'archicode diff');
  assert.ok(want.length >= 5, 'the file has the cases: ' + want.length);
  for (const check of want) {
    // the application box on the map; the environment's nodes on the detailed view of `prod`.
    const stereotypes =
      check.layer === 'application'
        ? await drawn(byId(check.in), 'map', '', 'application')
        : await drawn(byId(check.in), 'detailed', 'prod', 'technology');
    assert.ok(stereotypes.has(check.ref), check.in + ': ' + check.ref + ' is drawn');
    assert.ok(
      stereotypes.get(check.ref).includes('contains-changes'),
      check.in + ' ' + check.ref + ': ' + JSON.stringify(stereotypes.get(check.ref))
    );
    const out = await compare(byId(check.in));
    assert.equal(
      out.elements.find((e) => e.layer === check.layer && e.reference === check.ref).change,
      'none',
      check.ref + ' has no change of its own'
    );
  }
});

// ---- E1 (section 12): the views of the union of a plateau that replaces elements ----

test('E1: every view of every environment of the union is drawn for inhouse against baseline and marketplace against inhouse (it failed on a dangling reference)', async () => {
  const { state, sides } = await brightcart();
  const environments = sides.inhouse.technology.filter((e) => !e.reference.includes('.')).map((e) => e.reference);
  assert.ok(environments.length >= 3, 'the environments of the fixture: ' + environments.join(', '));
  assert.ok(state.plateauTree.nodes.size === 4);
  for (const id of ['P2', 'P3']) {
    for (const environment of environments) {
      for (const viewpoint of ['overview', 'detailed', 'deep']) {
        const stereotypes = await drawn(byId(id), viewpoint, environment, 'technology'); // asserts there is no error
        assert.ok(stereotypes.has(environment), id + ' ' + viewpoint + ' ' + environment + ' is drawn');
      }
    }
  }
});

test('E1: a node of the baseline that is removed deploys what replaced the application it deployed, and nothing points at a replaced element', async () => {
  for (const id of ['P2', 'P3']) {
    const out = await compare(byId(id));
    const known = new Set(out.elements.map((e) => e.layer + '|' + e.reference));
    for (const e of out.elements) {
      for (const application of e.applications)
        assert.ok(
          known.has('application|' + application),
          id + ': ' + e.reference + ' deploys ' + application + ', which is not in the union'
        );
      for (const used of e.uses)
        assert.ok(
          known.has('technology|' + used),
          id + ': ' + e.reference + ' uses ' + used + ', which is not in the union'
        );
    }
  }
  // the facts the fix is about: the replaced cache is no element of the union of P2, and the node that hosted it is removed and hosts the cache that replaced it
  const out = await compare(byId('P2'));
  assert.equal(
    out.elements.some((e) => e.layer === 'application' && e.reference === 'shop.cache'),
    false
  );
  const hosts = out.elements.filter(
    (e) => e.layer === 'technology' && e.change === 'removed' && e.applications.includes('commerce.cart-store')
  );
  assert.ok(hosts.length > 0, 'a removed node deploys commerce.cart-store, which replaced shop.cache');
});

// ---- the same bytes whatever the order ----

test('compare answers the same bytes for the same plateaus, whatever the order of their lists (P2)', async () => {
  const { kernel, sides } = await brightcart();
  const reverse = (side) => ({
    application: side.application
      .slice()
      .reverse()
      .map((e) => Object.assign({}, e, { relationships: (e.relationships || []).slice().reverse() })),
    technology: side.technology.slice().reverse()
  });
  const first = JSON.stringify(kernel.compare({ base: sides.baseline, target: sides.inhouse, on_one_chain: true }));
  assert.equal(
    first,
    JSON.stringify(kernel.compare({ base: sides.baseline, target: sides.inhouse, on_one_chain: true })),
    'twice'
  );
  assert.equal(
    first,
    JSON.stringify(
      kernel.compare({ base: reverse(sides.baseline), target: reverse(sides.inhouse), on_one_chain: true })
    ),
    'reordered'
  );
});
