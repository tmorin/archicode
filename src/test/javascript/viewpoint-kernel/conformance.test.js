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

const linkKey = (l) => [l.from, l.to, l.label || '', Array.from(l.qualifiers).sort().join(',')].join('|');

test('the fixture is what the tests below expect it to be', async () => {
  const { state } = await openFixture();
  assert.ok(state.index.application.size >= 15, 'application elements: ' + state.index.application.size);
  assert.ok(state.index.technology.size >= 8, 'technology elements: ' + state.index.technology.size);
  assert.deepEqual(Array.from(state.workspace.settings.facets.customs, (f) => f.name).sort(), ['keep-untyped', 'no-smtp', 'quiet-infra', 'rest-only']);
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
          const mine = new Set(out.links.filter((l) => !l.secondary).map(linkKey));
          const ids = new Set(out.items.map((i) => i.id));
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

test('the output states its contract version and says what each link stands for', async () => {
  const { sandbox, kernel } = await openFixture();
  const out = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input);
  assert.equal(out.version, 1);
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

test('a facet the browser cannot evaluate is reported, not ignored', async () => {
  const { sandbox, kernel } = await openFixture();
  const facet = { name: 'odd', actions: [{ operator: 'REMOVE', jsonPath: "$.application.elements[?(@.id == 'x')]" }] };
  const out = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api', { facet }).input);
  assert.match(out.error, /unsupported facet action/);
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
        const mine = new Set(out.links.filter((l) => !l.secondary).map(linkKey));
        const diff = (a, b) => [...a].filter((v) => !b.has(v));
        const bad = diff(mine, gold.links).concat(diff(gold.links, mine));
        if (viewpoint === 'overview') {
          const ids = new Set(out.items.map((i) => i.id));
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
