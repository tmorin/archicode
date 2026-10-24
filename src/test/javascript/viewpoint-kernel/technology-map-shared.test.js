'use strict';
// The CLI and the editor draw the same boxes and the same links for a map of the technology layer (wave 015, run 0099, issue #92; wave 016, run 0114, issue #107). One file is the contract
// both sides read: src/test/resources/technology-map/expected-boxes.json, for the saved maps of the example the manual ships (src/doc/examples/domain_technology_map) and of the layered
// Brightcart, each also drawn with the properties its variants put over its own (`applications` and `relationships` false, more boxes opened). This test opens each workspace in the editor,
// shows each view on the page of a view and on the page Environments (the real `render()` over the embedded kernel and a fake layout engine) and asserts the file; `TechnologyMapTest.java`
// asserts what the viewpoint of the command line gives for the same views, so either side drifting fails a test.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run, plain, startPage } = require('./library-page');

const REPO = path.resolve(__dirname, '../../../..');
const CONTRACT = JSON.parse(
  fs.readFileSync(path.join(REPO, 'src/test/resources/technology-map/expected-boxes.json'), 'utf8')
);

const boxesOf = (html) => Array.from(html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]).sort();
const linksOf = (html) =>
  Array.from(
    html.matchAll(/<g class="dg-link" data-from="([^"]*)" data-to="([^"]*)"/g),
    (m) => m[1] + ' -> ' + m[2]
  ).sort();

/** Every drawing of the contract: the view as saved, then each variant, with the properties to put over the view's own (none for the view itself). */
function drawings(view) {
  return [{ name: '', properties: null, expected: view }].concat(
    Object.entries(view.variants || {}).map(([name, variant]) => ({
      name: ' ' + name,
      properties: variant.properties,
      expected: variant
    }))
  );
}

/** The page Environments or the page of a view, on a plateau of a workspace of the contract. */
const open = (entry, view) => startPage({ dir: path.join(REPO, entry.workspace), plateau: view.plateau });

test('the contract names saved maps of each workspace, and every map of the example', async () => {
  for (const entry of CONTRACT.workspaces) {
    const page = await open(entry, {});
    assert.equal(page.state.fatalError, null, entry.workspace);
    const maps = plain(
      run(
        page.sandbox,
        'savedViews().filter((view) => view.viewpoint === "map" && view.layer === "technology").map((view) => view.id)'
      )
    ).sort();
    const named = Object.keys(entry.views).sort();
    assert.ok(
      named.every((id) => maps.includes(id)),
      entry.workspace + ': ' + named + ' are views of the workspace (' + maps + ')'
    );
    if (entry.workspace.includes('domain_technology_map'))
      assert.deepEqual(maps, named, 'the example declares the views of the contract and no other');
  }
});

test('the editor draws the boxes and the links the contract of the command line says, for every saved map and every variant, on the page of a view', async () => {
  let drawn = 0;
  for (const entry of CONTRACT.workspaces) {
    for (const [id, expected] of Object.entries(entry.views)) {
      for (const drawing of drawings(expected)) {
        const page = await open(entry, expected);
        const view = page.sandbox.findSavedView(id);
        assert.equal(view.viewpoint, 'map', id);
        assert.equal(view.layer, 'technology', id);
        if (drawing.properties) Object.assign((view.properties = view.properties || {}), drawing.properties);
        assert.equal(run(page.sandbox, 'viewProblem(findSavedView(' + JSON.stringify(id) + '))'), null, id);
        run(page.sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(id) + ';');
        page.sandbox.setPerspective('library');
        await page.drawn();
        const html = page.scene().html;
        assert.deepEqual(boxesOf(html), drawing.expected.boxes, id + drawing.name + ': boxes');
        assert.deepEqual(linksOf(html), drawing.expected.links, id + drawing.name + ': links');
        drawn++;
      }
    }
  }
  assert.equal(drawn, 14);
});

test('the page Environments draws every view of the contract once its recipe is applied, with the same boxes and links, and the screen is the view', async () => {
  for (const entry of CONTRACT.workspaces) {
    for (const [id, expected] of Object.entries(entry.views)) {
      for (const drawing of drawings(expected)) {
        const page = await open(entry, expected);
        const view = page.sandbox.findSavedView(id);
        if (drawing.properties) Object.assign((view.properties = view.properties || {}), drawing.properties);
        assert.equal(page.sandbox.applySavedView(view), null, id);
        assert.equal(run(page.sandbox, 'currentPerspective'), 'environments', id);
        await page.show();
        const html = page.scene().html;
        assert.deepEqual(boxesOf(html), drawing.expected.boxes, id + drawing.name + ' on the page Environments: boxes');
        assert.deepEqual(linksOf(html), drawing.expected.links, id + drawing.name + ' on the page Environments: links');
        assert.equal(
          run(page.sandbox, 'viewMatchesScreen(findSavedView(' + JSON.stringify(id) + '))'),
          true,
          id + drawing.name + ': the screen is the view'
        );
      }
    }
  }
});
