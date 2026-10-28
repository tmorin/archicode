'use strict';
// The story player plays a story of a flow (wave 026, run 0200, issue #143, TDD DEC-2, DEC-9, REQ-2; the P3 gate): each step carries the relationships so far in `links` and the newest in
// its own `highlight` key, so the modal shows one heavy link per step, the same links the editing walk draws, announces what a step highlights, and leaves the editor byte for byte what it
// was. A step without a highlight is announced word for word as before. RED until the scene draws the key and the announcement says it. The story is written here, on the layered Brightcart
// (the shopper's path: customer, shop.web, shop.app, shop.app.payments, psp), in a file that no shipped folder has; the shipped story is the next task's.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('./library-page');
const {
  LAYERED,
  shippedFiles,
  boxesAndLinks,
  openPlayerPage,
  sceneShown,
  playerClick,
  pressPlay,
  press,
  editorOf
} = require('./story-player-page');

const BROWSES = { source: 'customer', destination: 'shop.web', label: 'browses and buys with' };
const CALLS = { source: 'shop.web', destination: 'shop.app', label: 'calls' };
const PAYS = { source: 'shop.app.payments', destination: 'psp', label: 'authorises payments with' };
const entryYaml = (e, indent) =>
  ' '.repeat(indent) + '- {source: "' + e.source + '", destination: "' + e.destination + '", label: "' + e.label + '"}';
const step = (links, newest, text) =>
  [
    '    - viewpoint: "map"',
    '      layer: "application"',
    '      properties:',
    '        opened: ["shop", "shop.app"]',
    '        links:',
    links.map((e) => entryYaml(e, 10)).join('\n'),
    '      highlight:',
    entryYaml(newest, 8),
    '      text: "' + text + '"'
  ].join('\n');
const STORY = [
  'header:',
  '  kind: "archicode.morin.io/story"',
  '  version: "1"',
  'content:',
  '  id: "flow_under_test"',
  '  name: "A flow under test"',
  '  steps:',
  step([BROWSES], BROWSES, 'The shopper opens the shop.'),
  step([BROWSES, CALLS], CALLS, 'The shop calls its application.'),
  step([BROWSES, CALLS, PAYS], PAYS, 'The application pays.'),
  ''
].join('\n');
const ID = 'flow_under_test';
const NEWEST = ['customer>shop.web', 'shop.web>shop.app', 'shop.app>psp'];
const files = () => Object.assign({}, shippedFiles(LAYERED), { 'shared/story.flow_under_test.yaml': STORY });

/** The links of a markup drawn heavy, as `from>to`. */
const heavy = (html) =>
  Array.from(html.matchAll(/<g class="dg-link"[^>]*data-from="([^"]*)" data-to="([^"]*)"[^>]*>[\s\S]*?<\/g>/g))
    .filter((m) => /class="dg-edge[^"]*\bdg-hl\b/.test(m[0]))
    .map((m) => m[1] + '>' + m[2]);

async function editingWalk() {
  const editing = await openPlayerPage(files(), {});
  assert.equal(editing.state.fatalError, null);
  const walked = [];
  for (let i = 0; i < 3; i++) {
    editing.sandbox.goToStoryStep(ID, i);
    await editing.drawn();
    const html = editing.scene().html;
    walked.push({ drawn: boxesAndLinks(html), heavy: heavy(html) });
  }
  return walked;
}

test('the editing walk draws one heavy link per step, the newest, and the links so far', async () => {
  const walked = await editingWalk();
  walked.forEach((w, i) => {
    assert.deepEqual(w.heavy, [NEWEST[i]], 'step ' + (i + 1));
    assert.equal(w.drawn.links.length, i + 1, 'the relationships so far');
  });
});

test('the player draws the same boxes and links as the walk, one heavy link per step, in the scene and in the modal', async () => {
  const walked = await editingWalk();
  const page = await openPlayerPage(files(), {});
  pressPlay(page, ID);
  for (let i = 0; i < 3; i++) {
    await sceneShown(page, i);
    const scene = run(page.sandbox, 'storyPlayer.scene');
    assert.equal(scene.problem, null, 'step ' + (i + 1));
    assert.deepEqual(boxesAndLinks(scene.diagram.html), walked[i].drawn, 'step ' + (i + 1) + ': boxes and links');
    assert.deepEqual(heavy(scene.diagram.html), [NEWEST[i]], 'step ' + (i + 1) + ': the scene');
    assert.deepEqual(heavy(page.root.innerHTML), [NEWEST[i]], 'step ' + (i + 1) + ': the markup of the modal');
    assert.doesNotMatch(page.root.innerHTML, /data-action=|role="link"/, 'the markup still selects nothing');
    if (i < 2) playerClick(page, 'next');
  }
  press(page, 'Escape');
});

test('each step is announced with what it highlights, the display names and the label; the region says it', async () => {
  const page = await openPlayerPage(files(), {});
  const said = [0, 1, 2].map((i) => page.sandbox.storyStepAnnouncement(page.sandbox.findStory(ID), i));
  assert.match(said[0], /^Step 1 of 3.* Highlighted: Shopper to Web storefront, browses and buys with\.$/);
  assert.match(said[1], /^Step 2 of 3.* Highlighted: Web storefront to .+, calls\.$/);
  assert.match(said[2], /^Step 3 of 3.* Highlighted: Payments to .+, authorises payments with\.$/);
  pressPlay(page, ID);
  await sceneShown(page, 0);
  assert.equal(page.region.textContent, said[0]);
  playerClick(page, 'next');
  await sceneShown(page, 1);
  assert.equal(page.region.textContent, said[1]);
  press(page, 'Escape');
});

test('several entries are joined with a semicolon, an entry the plateau lacks is not announced, and no highlight is announced as before', async () => {
  const page = await openPlayerPage(files(), {});
  const many = { steps: [{ viewpoint: 'map', layer: 'application', properties: {}, highlight: [BROWSES, CALLS] }] };
  page.sandbox.__story = many;
  assert.match(
    String(run(page.sandbox, 'storyStepAnnouncement(__story, 0)')),
    /Highlighted: .+, browses and buys with; .+, calls\.$/
  );
  page.sandbox.__none = { steps: [{ viewpoint: 'map', layer: 'application', properties: {}, highlight: [] }] };
  assert.equal(run(page.sandbox, 'storyStepAnnouncement(__none, 0)'), 'Step 1 of 1');
  const old = page.sandbox.storyStepAnnouncement(page.sandbox.findStory('order_journey'), 0);
  assert.doesNotMatch(old, /Highlighted/);
  assert.match(old, /^Step 1 of 3, /);
});

test('after playing the flow and closing it, the editor is what it was: the state, the files, the caches, modelsChanged() never called', async () => {
  const page = await openPlayerPage(files(), {});
  await page.show();
  const before = editorOf(page);
  let changed = 0;
  const original = page.sandbox.modelsChanged;
  page.sandbox.modelsChanged = (...args) => {
    changed++;
    return original.apply(page.sandbox, args);
  };
  pressPlay(page, ID);
  for (let i = 0; i < 3; i++) {
    await sceneShown(page, i);
    if (i < 2) playerClick(page, 'next');
  }
  const mapHighlight = run(page.sandbox, 'typeof mapHighlight === "undefined" ? null : JSON.stringify(mapHighlight)');
  press(page, 'Escape');
  page.sandbox.modelsChanged = original;
  assert.equal(changed, 0);
  assert.equal(
    mapHighlight,
    '[]',
    'the live highlight of the editor is not the player’s: it exists and was not written'
  );
  const after = editorOf(page);
  assert.deepStrictEqual(after.state, before.state);
  for (const key of ['perspective', 'hash', 'version', 'activeStory', 'storyHome', 'html', 'files', 'writes'])
    assert.deepStrictEqual(after[key], before[key], key);
  assert.equal(after.diagramScene, before.diagramScene);
  assert.equal(run(page.sandbox, 'JSON.stringify(mapHighlight)'), '[]');
  assert.equal(run(page.sandbox, 'JSON.stringify(mapLinks)'), '[]');
});

test('the toggles of the editor do not change what the player highlights', async () => {
  const a = await openPlayerPage(files(), {});
  const b = await openPlayerPage(files(), {});
  b.state.changesOnly = true;
  const out = [];
  for (const page of [a, b]) {
    pressPlay(page, ID);
    await sceneShown(page, 0);
    playerClick(page, 'next');
    await sceneShown(page, 1);
    playerClick(page, 'previous');
    await sceneShown(page, 0);
    out.push(heavy(run(page.sandbox, 'storyPlayer.scene').diagram.html));
    press(page, 'Escape');
  }
  assert.deepEqual(out[0], out[1]);
  assert.deepEqual(out[0], [NEWEST[0]]);
});
