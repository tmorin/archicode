'use strict';
// The viewpoint kernel (Rust, compiled to WebAssembly, embedded in standalone.html) against the PlantUML files the
// ArchiCode CLI generates for the same workspace: every box and every link of every view, for the workspace itself
// and for each of its facets. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { FIXTURE, openFixture } = require('./harness');

const SHAPES = 'rectangle|person|database|node|card|actor|queue|cloud|component|folder|frame|package|storage|artifact|collections|stack|boundary|control|entity|file|hexagon|label|usecase|interface';

/** What a generated .puml draws: its links as from|to|label|qualifiers, and the ids of its boxes. */
function parsePuml(text) {
  const links = new Set();
  const items = new Set();
  for (const line of text.split(/\r?\n/)) {
    let m = line.match(/^(\S+) (-->|\.\.\[#gray\]>) (\S+)(?: : (.*))?$/);
    if (m) {
      let qualifiers = [];
      const label = [];
      for (const part of (m[4] || '').split('\\n')) {
        const q = part.match(/^""\[(.*)\]""$/);
        if (q) qualifiers = q[1].split(', ').filter(Boolean);
        else if (part) label.push(part);
      }
      links.add([m[1], m[3], label.join('\n'), qualifiers.sort().join(',')].join('|'));
      continue;
    }
    m = line.match(new RegExp('^(?:' + SHAPES + ')\\s+(\\S+)'));
    if (m && m[1] !== '{') items.add(m[1]);
  }
  return { links, items };
}

const linkKey = (l, name = (id) => id) => [name(l.from), name(l.to), l.label || '', Array.from(l.qualifiers).sort().join(',')].join('|');

/**
 * The name the CLI gives each id of a view in its PlantUML (rendering/plantuml/PlantumlNames.java): PlantUML reads letters,
 * digits, `_` and `.`; an id made of those is its own name, any other has each other character replaced by `_`, and a name
 * another id of the view already has is told apart by a number, in the order of the ids.
 */
function plantumlNames(ids) {
  const readable = /^[\p{L}\p{Nd}_.]+$/u;
  const sorted = Array.from(new Set(ids)).sort();
  const taken = new Set(sorted.filter((id) => readable.test(id)));
  const names = new Map(sorted.filter((id) => readable.test(id)).map((id) => [id, id]));
  for (const id of sorted.filter((i) => !readable.test(i))) {
    const base = id.replace(/[^\p{L}\p{Nd}_.]/gu, '_');
    let name = base;
    for (let n = 2; taken.has(name); n++) name = base + '_' + n;
    taken.add(name);
    names.set(id, name);
  }
  return (id) => names.get(id);
}

test('the fixture is what the tests below expect it to be', async () => {
  const { state } = await openFixture();
  assert.ok(state.index.application.size >= 15, 'application elements: ' + state.index.application.size);
  assert.ok(state.index.technology.size >= 8, 'technology elements: ' + state.index.technology.size);
  assert.deepEqual(Array.from(state.workspace.settings.facets.customs, (f) => f.name).sort(), ['audited-only', 'compound', 'keep-untyped', 'no-smtp', 'quiet-infra', 'rest-only', 'rest-only-standard', 'unaudited']);
});

test('every generated view is reproduced, for the workspace and for each facet', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const sets = [{ dir: 'views', facet: null }].concat(
    state.workspace.settings.facets.customs.map((facet) => ({ dir: 'views-' + facet.name, facet }))
  );
  let checked = 0;
  const problems = [];
  for (const set of sets) {
    const seen = new Set();
    for (const layer of ['application', 'technology']) {
      const dir = path.join(FIXTURE, set.dir, 'plantuml', layer);
      for (const ref of state.index[layer].keys()) {
        for (const viewpoint of ['overview', 'detailed', 'deep']) {
          const file = path.join(dir, ref.replace(/\./g, '_') + '-' + viewpoint + '.puml');
          if (!fs.existsSync(file)) continue;
          seen.add(file);
          const gold = parsePuml(fs.readFileSync(file, 'utf8'));
          const { input } = sandbox.buildKernelInput(viewpoint, ref, { layer, facet: set.facet });
          const out = kernel.compute(input);
          const where = set.dir + '/' + layer + '/' + ref + ' ' + viewpoint;
          if (out.error) { problems.push(where + ': ' + out.error); continue; }
          const name = plantumlNames(out.items.map((i) => i.id));
          const mine = new Set(out.links.filter((l) => !l.secondary).map((l) => linkKey(l, name)));
          const ids = new Set(out.items.map((i) => name(i.id)));
          const diff = (a, b) => [...a].filter((v) => !b.has(v));
          const extra = { links: diff(mine, gold.links), items: diff(ids, gold.items) };
          const missing = { links: diff(gold.links, mine), items: diff(gold.items, ids) };
          if (extra.links.length + extra.items.length + missing.links.length + missing.items.length) {
            problems.push(where + '\n   only in the kernel: ' + JSON.stringify(extra) + '\n   only in the CLI:    ' + JSON.stringify(missing));
          }
          checked++;
        }
      }
      const generated = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.puml')) : [];
      const unmatched = generated.filter((f) => !seen.has(path.join(dir, f)));
      assert.deepEqual(unmatched, [], set.dir + '/' + layer + ': generated views the model does not explain');
    }
  }
  assert.deepEqual(problems, []);
  assert.ok(checked >= 5 * 40, 'only ' + checked + ' views were compared');
});

/**
 * The stereotypes the CLI draws each box with, from what its generated .puml says of the box, without the ones of the way
 * it is drawn (the kind and `atomic`, or `composite`). The .puml lists them last first (PlantUML lets the first
 * stereotype of a box win, the editor the last one), so they are put back in the order of the kernel.
 */
function pumlStereotypes(text) {
  const boxes = new Map();
  for (const line of text.split(/\r?\n/)) {
    let m = line.match(new RegExp('^(?:' + SHAPES + ') (\\S+) ((?:<<.+?>> ?)+) \\[$'));
    let drawnWith = 2;
    if (!m) {
      m = line.match(new RegExp('^(?:' + SHAPES + ') (\\S+) as ".*" ((?:<<.+?>> ?)+) \\{$'));
      drawnWith = 1;
    }
    if (m) boxes.set(m[1], Array.from(m[2].matchAll(/<<(.+?)>>/g), (s) => s[1]).slice(0, -drawnWith).reverse());
  }
  return boxes;
}

test('the stereotypes of every box are the ones the CLI draws it with: the qualifiers, then each word of rendering-stereotypes', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const sets = [{ dir: 'views', facet: null }].concat(
    state.workspace.settings.facets.customs.map((facet) => ({ dir: 'views-' + facet.name, facet }))
  );
  const seen = new Set();
  const problems = [];
  let boxes = 0;
  for (const set of sets) {
    for (const layer of ['application', 'technology']) {
      const dir = path.join(FIXTURE, set.dir, 'plantuml', layer);
      for (const ref of state.index[layer].keys()) {
        for (const viewpoint of ['overview', 'detailed', 'deep']) {
          const file = path.join(dir, ref.replace(/\./g, '_') + '-' + viewpoint + '.puml');
          if (!fs.existsSync(file)) continue;
          const gold = pumlStereotypes(fs.readFileSync(file, 'utf8'));
          const out = kernel.compute(sandbox.buildKernelInput(viewpoint, ref, { layer, facet: set.facet }).input);
          const name = plantumlNames(out.items.map((i) => i.id));
          for (const item of out.items) {
            if (!gold.has(name(item.id))) { problems.push(file + ': no box ' + item.id); continue; }
            boxes++;
            const mine = Array.from(item.stereotypes); // from another realm: copied
            if (JSON.stringify(mine) !== JSON.stringify(gold.get(name(item.id)))) problems.push(file + ' ' + item.id + ': the kernel says ' + JSON.stringify(mine) + ', the CLI draws ' + JSON.stringify(gold.get(name(item.id))));
            mine.forEach((s) => seen.add(s));
          }
        }
      }
    }
  }
  assert.deepEqual(problems, []);
  assert.ok(boxes >= 5 * 100, 'only ' + boxes + ' boxes were compared');
  for (const expected of ['external', 'changed', 'Spring Boot', 'PostgreSQL']) assert.ok(seen.has(expected), expected + ' is among the stereotypes compared');
  assert.ok(!seen.has('external changed'), 'the tag is a list, not one stereotype');
});

test('the tag is split into stereotypes by the editor too, from the elements it sends', async () => {
  const { sandbox, kernel } = await openFixture();
  const out = kernel.compute(sandbox.buildKernelInput('overview', 'shop.catalog.service').input);
  const stereotypesOf = (id) => Array.from(out.items.find((i) => i.id === id).stereotypes);
  assert.deepEqual(stereotypesOf('mailer'), ['external', 'changed'], 'one word per stereotype');
  assert.deepEqual(stereotypesOf('shop.catalog.service'), ['Quarkus'], 'the qualifiers, whole');
});

test('the output states its contract version and says what each link stands for', async () => {
  const { sandbox, kernel } = await openFixture();
  const out = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input);
  assert.equal(out.version, 5);
  for (const link of out.links) {
    assert.ok(link.relationships.length >= 1, link.from + ' -> ' + link.to + ' stands for no relationship');
  }
  const grouped = out.links.find((l) => l.synthetic);
  assert.ok(grouped, 'the overview of an API groups some links under enclosing elements');
});

test('a folded box hides what is inside it and the links follow', async () => {
  const { sandbox, kernel } = await openFixture();
  const open = kernel.compute(sandbox.buildKernelInput('deep', 'shop.catalog').input);
  const folded = kernel.compute(sandbox.buildKernelInput('deep', 'shop.catalog', { collapsed: ['shop.catalog.service'] }).input);
  const box = folded.items.find((i) => i.id === 'shop.catalog.service');
  assert.equal(box.collapsed, true);
  assert.equal(box.hidden, open.items.filter((i) => i.id.startsWith('shop.catalog.service.')).length);
  assert.ok(!folded.items.some((i) => i.id.startsWith('shop.catalog.service.')), 'the inside is gone');
  assert.ok(folded.links.every((l) => !l.from.startsWith('shop.catalog.service.') && !l.to.startsWith('shop.catalog.service.')), 'no link reaches inside any more');
});

test('a facet that cannot be evaluated is reported, not ignored', async () => {
  const { sandbox, kernel } = await openFixture();
  const compute = (actions) => kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api', { facet: { name: 'odd', actions } }).input);
  assert.match(compute([{ operator: 'REMOVE', jsonPath: '$..relationships[?(@.label == ' }]).error, /invalid facet JSONPath/);
  assert.match(compute([{ operator: 'KEEP', jsonPath: "$..relationships[?(@.label == 'x')]" }]).error, /unsupported facet action: KEEP/);
});

test('a facet written for the earlier engine (Jayway) is refused with the standard form to write, and the standard form says nothing (#128)', async () => {
  const { sandbox, kernel } = await openFixture();
  const compute = (jsonPath) => kernel.compute(sandbox.buildKernelInput('deep', 'shop.web.api', { facet: { name: 'f', actions: [{ operator: 'REMOVE', jsonPath }] } }).input);
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'facet-dialect-cases.json'), 'utf8'));
  for (const c of cases.refused) {
    const out = compute(c.path);
    assert.equal(out.error, c.error, c.id);
    assert.equal(out.items, undefined, c.id + ': nothing is drawn');
  }
  for (const accepted of cases.accepted) assert.equal(compute(accepted).error, undefined, accepted);
  const standard = compute("$.application..relationships[?(@.qualifiers && !@.qualifiers[?(@ == 'REST')])]");
  assert.equal(standard.warnings, undefined);
  assert.ok(standard.links.length > 0 && standard.links.length < compute("$..relationships[?(@.label == 'none')]").links.length);
});

test('the facets that filter on tags, qualifiers and labels keep what a plain reading of the manifests says', async () => {
  // an oracle that is neither the kernel nor the CLI: the relationships of the model, filtered here by hand
  const { sandbox, state, kernel } = await openFixture();
  const rels = [];
  for (const record of state.index.application.values()) {
    for (const rel of record.relationships) rels.push({ from: record.reference, to: rel.destination, label: rel.rawLabel || '', tags: rel.tags || {}, qualifiers: rel.qualifiers || [] });
  }
  assert.ok(rels.some((r) => r.tags.audited === 'yes') && rels.some((r) => r.tags.audited === 'no') && rels.some((r) => r.label === 'routes to'), 'the fixture has what the facets look at');
  const kept = {
    unaudited: (r) => r.tags.audited !== 'yes',
    'audited-only': (r) => r.tags.audited === 'yes',
    compound: (r) => !(r.label === 'routes to' || r.tags.audited === 'yes'),
    'rest-only-standard': (r) => r.qualifiers.includes('REST')
  };
  const everything = Array.from(state.index.application.keys());
  for (const [name, keep] of Object.entries(kept)) {
    const facet = state.workspace.settings.facets.customs.find((f) => f.name === name);
    const out = kernel.compute(sandbox.buildKernelInput('map', null, { facet, opened: everything }).input);
    assert.equal(out.error, undefined, name);
    const mine = Array.from(out.links.flatMap((l) => l.relationships.map((r) => [r.from, r.destination, r.label || ''].join('|')))).sort(); // from another realm: copied
    const expected = rels.filter(keep).map((r) => [r.from, r.to, r.label].join('|')).sort();
    assert.deepEqual(mine, expected, name);
    assert.ok(expected.length > 0 && expected.length < rels.length, name + ' keeps some of the relationships, not all');
  }
});

test('the kernel the CLI runs is the one the editor embeds', () => {
  const html = fs.readFileSync(path.join(FIXTURE, '../../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  const embedded = html.match(/<script type="application\/octet-stream" id="viewpoint-kernel-wasm">([^<]+)<\/script>/)[1];
  const file = fs.readFileSync(path.join(FIXTURE, '../../../../main/wasm/viewpoint_kernel.wasm'));
  assert.equal(Buffer.from(embedded, 'base64').equals(file), true, 'run src/main/rust/viewpoint-kernel/embed.sh');
});

test('the map, pinned on one element with nothing open, draws the overview the CLI generates; with everything open, its deep links', async () => {
  const { sandbox, state, kernel } = await openFixture();
  const sets = [{ dir: 'views', facet: null }].concat(
    state.workspace.settings.facets.customs.map((facet) => ({ dir: 'views-' + facet.name, facet }))
  );
  const everything = Array.from(state.index.application.keys());
  const problems = [];
  let checked = 0;
  for (const set of sets) {
    const dir = path.join(FIXTURE, set.dir, 'plantuml', 'application');
    for (const ref of state.index.application.keys()) {
      for (const viewpoint of ['overview', 'deep']) {
        const file = path.join(dir, ref.replace(/\./g, '_') + '-' + viewpoint + '.puml');
        if (!fs.existsSync(file)) continue;
        const gold = parsePuml(fs.readFileSync(file, 'utf8'));
        const { input } = sandbox.buildKernelInput('map', null, { facet: set.facet, pinned: [ref], opened: viewpoint === 'deep' ? everything : [] });
        const out = kernel.compute(input);
        const where = set.dir + ' ' + ref + ' ' + viewpoint;
        if (out.error) { problems.push(where + ': ' + out.error); continue; }
        const name = plantumlNames(out.items.map((i) => i.id));
        const mine = new Set(out.links.filter((l) => !l.secondary).map((l) => linkKey(l, name)));
        const diff = (a, b) => [...a].filter((v) => !b.has(v));
        const bad = diff(mine, gold.links).concat(diff(gold.links, mine));
        if (viewpoint === 'overview') {
          const ids = new Set(out.items.map((i) => name(i.id)));
          bad.push(...diff(ids, gold.items), ...diff(gold.items, ids)); // the deep view draws only the boxes links reach; the map also draws the children it opens
        }
        if (bad.length) problems.push(where + ' ' + JSON.stringify(bad));
        checked++;
      }
    }
  }
  assert.deepEqual(problems, []);
  assert.ok(checked >= 100, 'only ' + checked + ' views were compared');
});
