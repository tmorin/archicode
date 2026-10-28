'use strict';
// What the six map-links-*.test.js files share (wave 026, run 0199, issue #143, W-5): the cases of the entry model, the contract file of the command line and the editor, a page
// opened on the bookshop of the manual (domain_plateaus) or on the layered Brightcart in an in-memory folder, and the readings of a drawing. Not a test: `node --test` does not run it.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const library = require('./viewpoint-kernel/library-page');

const REPO = path.resolve(__dirname, '../../..');
const BOOKSHOP = path.join(REPO, 'src/doc/examples/domain_plateaus');
const BRIGHTCART = path.join(REPO, 'src/test/resources/brightcart/layered');
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'viewpoint-kernel/map-links-cases.json'), 'utf8'));
const CONTRACT = JSON.parse(
  fs.readFileSync(path.join(REPO, 'src/test/resources/map-links/expected-boxes.json'), 'utf8')
);
const { run, plain, startPage, click } = library;

/** An entry as the page holds it: `label` is absent when there is none. */
const entry = (source, destination, label) =>
  label === undefined ? { source, destination } : { source, destination, label };

/** The ids of the boxes and the pairs of the links of a drawing, sorted, as the contract file lists them. */
const boxIdsOf = (html) => Array.from(html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]).sort();
const linkPairsOf = (html) =>
  Array.from(
    new Set(
      Array.from(
        html.matchAll(/<g class="dg-link" data-from="([^"]*)" data-to="([^"]*)"/g),
        (m) => m[1] + ' -> ' + m[2]
      )
    )
  ).sort();

/** A folder of the repository as a path -> text object, to open in memory (and to save, with the changes kept in `page.mem`). */
function filesOf(dir) {
  const out = {};
  const walk = (current) => {
    for (const name of fs.readdirSync(current).sort()) {
      const p = path.join(current, name);
      if (fs.statSync(p).isDirectory()) {
        if (!name.startsWith('views')) walk(p);
      } else out[path.relative(dir, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
    }
  };
  walk(dir);
  return out;
}

/** A page on a folder of the repository (the bookshop, the layered Brightcart) in memory, on a plateau; `extra` adds or replaces files. */
async function openWorkspace(dir, plateau, extra) {
  const page = await startPage({ only: Object.assign(filesOf(dir), extra || {}) });
  if (page.state.fatalError) throw new Error(String(page.state.fatalError));
  if (plateau && plateau !== 'baseline') page.sandbox.drawPlateau(plateau);
  run(page.sandbox, 'revealDiagramNode = function () {};'); // the marks of the fake canvas have no geometry to scroll to
  return page;
}

/** A saved Map view of the application layer, added to the page (not written until Save all changes). */
function addMapView(page, id, properties) {
  return page.sandbox.createManifestEntry('view', { id, name: id, viewpoint: 'map', layer: 'application', properties });
}

/** The page of a view in Stories, drawn. */
async function openViewPage(page, view) {
  run(page.sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(view.id) + ';');
  page.sandbox.setPerspective('library');
  return page.drawn().catch(() => null);
}

/** The model of the layer on screen, as `linkEntryExists` reads it: reference -> record, from a workspace of the cases file. */
function indexOfCaseWorkspace(elements) {
  return new Map(
    elements.map((spec) => [
      spec.reference,
      {
        reference: spec.reference,
        relationships: (spec.relationships || []).map((rel) => ({
          destination: rel.destination,
          label: rel.label === undefined ? 'depends on' : rel.label,
          rawLabel: rel.label === undefined ? null : rel.label,
          qualifiers: rel.qualifiers || [],
          tags: {}
        }))
      }
    ])
  );
}

/** `text` with the sentences of the page flattened: markup out, spaces collapsed. */
const textOf = (html) =>
  String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

module.exports = {
  REPO,
  BOOKSHOP,
  BRIGHTCART,
  CASES,
  CONTRACT,
  run,
  plain,
  click,
  vm,
  startPage,
  entry,
  boxIdsOf,
  linkPairsOf,
  filesOf,
  openWorkspace,
  addMapView,
  openViewPage,
  indexOfCaseWorkspace,
  textOf
};
