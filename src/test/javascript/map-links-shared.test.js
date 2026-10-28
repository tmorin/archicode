'use strict';
// The command line and the editor draw the same boxes and the same links for a Map with `links` (wave 026, run 0199, issue #143, TDD DEC-8, REQ-3). One file is the contract both sides read:
// src/test/resources/map-links/expected-boxes.json, written from the command line (`views generate -i` on temporary copies of the bookshop of the manual and of the layered Brightcart, to
// which each case adds its saved view). This test opens each workspace in the editor, draws each case on the page of a view, on the page Applications once the view is applied and in the
// story scene of a step that carries the same recipe (the real `render()` over the embedded kernel and a fake layout engine), and asserts the file; `MapLinksSharedTest.java` asserts the
// command line, so either side drifting fails a test. A case the command line skips (`drawn: false`) is a view the editor says cannot be drawn in this plateau.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  REPO,
  CONTRACT,
  run,
  plain,
  openWorkspace,
  addMapView,
  openViewPage,
  boxIdsOf,
  linkPairsOf
} = require('./map-links-support');

const cases = [];
for (const workspace of CONTRACT.workspaces)
  for (const [name, c] of Object.entries(workspace.cases))
    cases.push(Object.assign({ name, dir: path.join(REPO, workspace.workspace) }, c));

/** The properties the editor draws a case with: the view as the contract names it, and its facet (the command line applies the facets of the settings to every view; the editor reads the `facet` of the view). */
const propertiesOf = (c) =>
  Object.assign({}, JSON.parse(JSON.stringify(c.properties)), c.facet ? { facet: c.facet } : {});

/** A page on the workspace of a case, the plateau drawn and compared as the case says, with the view of the case added. */
async function openCase(c) {
  const page = await openWorkspace(c.dir, 'baseline');
  if (c.plateau !== 'baseline' || c.against)
    page.sandbox.drawPlateau(c.plateau, c.against ? { compare: 'other:' + c.against } : {});
  const view = addMapView(page, c.name, propertiesOf(c));
  return { page, view };
}

const NONE = /None of the relationships it shows is in the plateau “[^”]+”\./;

test('the contract names the cases the command line was run on, and every one has a view, boxes and links to compare', () => {
  assert.ok(cases.length >= 15, 'cases: ' + cases.length);
  assert.ok(
    cases.some((c) => c.against),
    'a comparison'
  );
  assert.ok(
    cases.some((c) => c.facet),
    'a facet'
  );
  assert.ok(
    cases.some((c) => !c.drawn),
    'a view the command line skips'
  );
  for (const c of cases) {
    assert.ok(Array.isArray(c.properties.links) && c.properties.links.length > 0, c.name + ': a view with links');
    assert.deepEqual(c.boxes, c.boxes.slice().sort(), c.name + ': sorted');
    assert.deepEqual(c.links, c.links.slice().sort(), c.name + ': sorted');
    if (!c.drawn) assert.deepEqual([c.boxes, c.links], [[], []], c.name);
  }
});

test('the page of a view draws the boxes and the links the command line draws, for every case of the contract', async () => {
  let drawn = 0;
  for (const c of cases) {
    const { page, view } = await openCase(c);
    if (!c.drawn) {
      assert.match(
        String(page.sandbox.viewProblem(page.sandbox.findSavedView(view.id))),
        NONE,
        c.name + ': the view cannot be drawn in this plateau'
      );
      continue;
    }
    assert.equal(page.sandbox.viewProblem(page.sandbox.findSavedView(view.id)), null, c.name);
    await openViewPage(page, view);
    const html = page.scene().html;
    assert.deepEqual(boxIdsOf(html), c.boxes, c.name + ': boxes');
    assert.deepEqual(linkPairsOf(html), c.links, c.name + ': links');
    drawn++;
  }
  assert.equal(drawn, cases.filter((c) => c.drawn).length);
});

test('the page Applications draws them too once the view is applied, and the screen is the view (the highlight apart)', async () => {
  for (const c of cases) {
    const { page, view } = await openCase(c);
    const problem = page.sandbox.applySavedView(page.sandbox.findSavedView(view.id));
    if (!c.drawn) {
      assert.match(String(problem), NONE, c.name);
      continue;
    }
    assert.equal(problem, null, c.name);
    assert.equal(run(page.sandbox, 'currentPerspective'), 'map', c.name);
    await page.show();
    const html = page.scene().html;
    assert.deepEqual(boxIdsOf(html), c.boxes, c.name + ' on the page Applications: boxes');
    assert.deepEqual(linkPairsOf(html), c.links, c.name + ' on the page Applications: links');
    assert.equal(
      run(page.sandbox, 'viewMatchesScreen(findSavedView(' + JSON.stringify(view.id) + '))'),
      true,
      c.name + ': the screen is the view'
    );
  }
});

test('the story scene of a step that carries the recipe draws them, told at the plateau and compared with the other one', async () => {
  for (const c of cases) {
    const page = await openWorkspace(c.dir, 'baseline');
    const step = { viewpoint: 'map', layer: 'application', properties: propertiesOf(c), at: c.plateau };
    if (c.against) step.against = c.against;
    page.sandbox.createManifestEntry('story', { id: 'tour', name: 'Tour', steps: [step] });
    const home = plain(run(page.sandbox, 'storyHomeNow()'));
    const scene = await page.sandbox.storyStepScene('tour', 0, { home });
    if (!c.drawn) {
      assert.match(String(scene.problem), NONE, c.name + ': the step cannot be shown in this plateau');
      continue;
    }
    assert.equal(scene.problem, null, c.name);
    assert.deepEqual(boxIdsOf(scene.diagram.html), c.boxes, c.name + ' in the story: boxes');
    assert.deepEqual(linkPairsOf(scene.diagram.html), c.links, c.name + ' in the story: links');
  }
});

test('an editor draws a Map without links as it did: the cases of the contract with their links taken out draw the whole map', async () => {
  const c = cases.find((candidate) => candidate.drawn && !candidate.against && !candidate.facet);
  const { page, view } = await openCase(c);
  assert.ok(page.sandbox.findSavedView(view.id).properties.links.length > 0);
  delete page.sandbox.findSavedView(view.id).properties.links;
  await openViewPage(page, page.sandbox.findSavedView(view.id));
  assert.ok(boxIdsOf(page.scene().html).length >= c.boxes.length, 'at least the boxes of the narrowed map');
  assert.ok(linkPairsOf(page.scene().html).length > c.links.length, 'and the links that the choice left out');
});
