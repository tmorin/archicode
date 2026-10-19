'use strict';
// The CLI and the editor draw the same boxes and the same links for a map of the technology layer (wave 015, run 0099, issue #92). One file is the contract both sides read:
// src/test/resources/technology-map/expected-boxes.json, next to the example the manual ships (src/doc/examples/domain_technology_map: three views of `layer: technology` and
// `viewpoint: map`). This test opens that example in the editor, shows each view on the page of a view (the real `render()` over the embedded kernel and a fake layout engine)
// and asserts the file; `TechnologyMapTest.java` asserts what the viewpoint of the command line gives for the same views, so either side drifting fails a test.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run, plain, startPage } = require('./library-page');

const REPO = path.resolve(__dirname, '../../../..');
const CONTRACT = JSON.parse(fs.readFileSync(path.join(REPO, 'src/test/resources/technology-map/expected-boxes.json'), 'utf8'));

test('the editor draws the boxes and the links the contract of the command line says, for every view of the example', async () => {
  const page = await startPage({ dir: path.join(REPO, CONTRACT.workspace) });
  assert.equal(page.state.fatalError, null);
  const ids = Object.keys(CONTRACT.views);
  assert.deepEqual(plain(run(page.sandbox, 'savedViews().map((view) => view.id)')).sort(), ids.slice().sort(), 'the example declares the views of the contract and no other');
  for (const id of ids) {
    const view = page.sandbox.findSavedView(id);
    assert.equal(view.viewpoint, 'map', id);
    assert.equal(view.layer, 'technology', id);
    assert.equal(run(page.sandbox, 'viewProblem(findSavedView(' + JSON.stringify(id) + '))'), null, id);
    run(page.sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(id) + ';');
    page.sandbox.setPerspective('library');
    await page.drawn();
    const html = page.scene().html;
    const boxes = Array.from(html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]).sort();
    const links = Array.from(html.matchAll(/<g class="dg-link" data-from="([^"]*)" data-to="([^"]*)"/g), (m) => m[1] + ' -> ' + m[2]).sort();
    assert.deepEqual(boxes, CONTRACT.views[id].boxes, id + ': boxes');
    assert.deepEqual(links, CONTRACT.views[id].links, id + ': links');
  }
});

test('the page Environments draws every view of the contract once its recipe is applied, with the same boxes', async () => {
  const page = await startPage({ dir: path.join(REPO, CONTRACT.workspace) });
  for (const id of Object.keys(CONTRACT.views)) {
    assert.equal(page.sandbox.applySavedView(page.sandbox.findSavedView(id)), null, id);
    assert.equal(run(page.sandbox, 'currentPerspective'), 'environments', id);
    await page.show();
    const boxes = Array.from(page.scene().html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]).sort();
    assert.deepEqual(boxes, CONTRACT.views[id].boxes, id + ' on the page Environments');
    assert.equal(run(page.sandbox, 'viewMatchesScreen(findSavedView(' + JSON.stringify(id) + '))'), true, id + ': the screen is the view');
  }
});
