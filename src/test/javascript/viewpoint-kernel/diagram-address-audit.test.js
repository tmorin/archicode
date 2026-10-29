'use strict';
// Wave 027, run 0203 (W-3, issue #178), TDD DEC-7 and VER-6 (RFC-001 DEC-2): the rule "an option is in the address when it changes the boxes and links drawn, or where" was broken before not by a
// decision but by omission (the hidden elements, the comparison). This audit keeps it true: every input the drawing reads is on the table below, either with the parameter of the address that
// carries it (and the writer must name that parameter) or with the reason it is not there. The inputs are taken from the source text of the functions that build the key of the diagram cache and the
// recipe and the kernel input, so a new input that nobody put on the table fails here.
// Written first, red: `layout`, `changes-only`, `open` and `hide` are on the table and the writer does not name them.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { REPO, BRIGHTCART, run, openWorkspace } = require('../map-links-support');

const HTML = fs.readFileSync(path.join(REPO, 'src/main/resources/editor-webapp/standalone.html'), 'utf8');

/** The functions whose text names the inputs of the drawing: the key of the cache, the recipes, the kernel input and the readers of the page state they call. */
const READERS = [
  'diagramCacheKey',
  'modelsKey',
  'mainDiagramRecipe',
  'libraryDiagramRecipe',
  'buildKernelInput',
  'viewDiagramRecipe',
  'currentDiagramFacet',
  'currentMapState',
  'mapPartsShown',
  'diagramShows',
  'columnsOfRecipe',
  'mapStateOf',
  'mapLayer',
  'effectiveDiagramViewpoint'
];
/** The functions that write the address: a parameter on the table must be named in one of them (or be a name in the constants they loop over). */
const WRITERS = [
  'currentRouteHash',
  'pushShowParams',
  'pushFrameParam',
  'pushLayoutParam',
  'mapLinkParams',
  'mapHighlightParams'
];

const EXCEPTION = {
  wording: 'an exception of RFC-001 DEC-2: how the changes are worded, not which boxes and links are drawn',
  files: 'a fact of the files the reader has (the workspace, its settings and styles, the view), not session state',
  route: 'the page itself: the route of the address names it',
  builder: 'an argument of the builder: fed by the recipe, whose inputs are on this table',
  tests: 'not passed by the page, only by tests'
};

/** Each input the drawing reads: `param` (the address parameter, or several) or `reason`. */
const INPUTS = {
  AppState: { reason: 'the container: its members are on the table one by one' },
  'AppState.baseline': { param: ['compare'] },
  'AppState.changesOnly': { param: ['changes-only'] },
  'AppState.hideWording': { reason: EXCEPTION.wording },
  'AppState.index': { param: ['plateau', 'compare'] },
  'AppState.workspace': { reason: EXCEPTION.files },
  currentPerspective: { reason: EXCEPTION.route },
  modelVersion: { reason: EXCEPTION.files },
  diagramColumns: { param: ['layout'] },
  diagramFacet: { param: ['facet'] },
  diagramHideUnlinked: { param: ['hide-unlinked'] },
  diagramShow: { param: ['labels', 'qualifiers', 'descriptions', 'wrap'] },
  elementTab: { param: ['tab'] },
  technologyMapParts: { param: ['applications', 'relationships'] },
  technologyMapState: { param: ['open', 'hide', 'pin'] },
  mapOpened: { param: ['open'] },
  mapHidden: { param: ['hide'] },
  mapPinned: { param: ['pin'] },
  mapLinks: { param: ['rel'] },
  mapHighlight: { param: ['hl'] },
  'mapState.opened': { param: ['open'] },
  'mapState.hidden': { param: ['hide'] },
  'mapState.pinned': { param: ['pin'] },
  'mapState.links': { param: ['rel'] },
  'mapState.highlight': { param: ['hl'] },
  'recipe.columns': { param: ['layout'] },
  'recipe.facet': { param: ['facet'] },
  'recipe.hideUnlinked': { param: ['hide-unlinked'] },
  'recipe.isMap': { reason: EXCEPTION.route },
  'recipe.layer': { reason: EXCEPTION.route },
  'recipe.mapState': { param: ['open', 'hide', 'pin', 'rel', 'hl'] },
  'recipe.record': { param: ['ref'] },
  'recipe.reference': { param: ['ref'] },
  'recipe.shows': { param: ['labels', 'qualifiers', 'descriptions', 'wrap'] },
  'recipe.viewpoint': { param: ['tab'] },
  'opts.collapsed': { reason: EXCEPTION.tests },
  'opts.expanded': { reason: EXCEPTION.tests },
  'opts.facet': { reason: EXCEPTION.builder },
  'opts.hidden': { reason: EXCEPTION.builder },
  'opts.highlight': { reason: EXCEPTION.builder },
  'opts.layer': { reason: EXCEPTION.builder },
  'opts.links': { reason: EXCEPTION.builder },
  'opts.opened': { reason: EXCEPTION.builder },
  'opts.pinned': { reason: EXCEPTION.builder },
  'opts.source': { reason: EXCEPTION.builder },
  'source.changesOnly': { param: ['changes-only'] },
  'source.comparison': { param: ['compare'] },
  'source.index': { param: ['plateau'] }
};

/** The source of a function without its comments (a comment may name anything). */
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

/** The names of the page state the sources read: members of the containers, destructured fields, and the top-level variables of the page. */
function inputsRead(sources, topLevelVariables) {
  const found = new Set();
  for (const raw of sources) {
    const source = withoutComments(raw);
    for (const m of source.matchAll(/\b(AppState|recipe|mapState|opts|options|source)\.([A-Za-z_$][\w$]*)/g))
      found.add((m[1] === 'options' ? 'opts' : m[1]) + '.' + m[2]);
    for (const m of source.matchAll(/const \{([^}]*)\} = (recipe|opts|options)\b/g))
      for (const field of m[1].split(','))
        if (field.trim()) found.add((m[2] === 'options' ? 'opts' : m[2]) + '.' + field.trim().split(':')[0].trim());
    for (const m of source.matchAll(/[A-Za-z_$][\w$]*/g)) if (topLevelVariables.has(m[0])) found.add(m[0]);
  }
  return found;
}

/** Whether the writers name the parameter: as `'name=`, as the quoted name handed to a helper (`mapEntryParams(entries, 'rel')`), or as one of the names they loop over (the four texts, the two parts). */
function writerNames(writerSources, constants) {
  const text = writerSources.map(withoutComments).join('\n');
  return (param) =>
    new RegExp('[\'"`]' + param.replace(/[-.]/g, '\\$&') + '(=|[\'"`])').test(text) || constants.includes(param);
}

/** The audit: the sentences of what is wrong, empty when the table and the writer agree with the sources. */
function audit(sources, writerSources, topLevelVariables, constants) {
  const problems = [];
  const read = inputsRead(sources, topLevelVariables);
  const names = writerNames(writerSources, constants);
  for (const input of Array.from(read).sort()) {
    const row = INPUTS[input];
    if (!row) {
      problems.push(
        `${input} is read by the drawing and is on neither list: add it to the address (currentRouteHash) or give the reason it is not there`
      );
      continue;
    }
    for (const param of row.param || [])
      if (!['ref', 'plateau', 'tab'].includes(param) && !names(param))
        problems.push(
          `${input} is carried by ${param}= according to the table, and currentRouteHash does not write ${param}=`
        );
  }
  return problems;
}

async function sandboxSources() {
  const page = await openWorkspace(BRIGHTCART, 'marketplace');
  const sandbox = page.sandbox;
  const source = (name) => run(sandbox, name + '.toString()');
  return {
    sandbox,
    sources: READERS.map(source),
    writers: WRITERS.map(source),
    topLevel: new Set(Array.from(HTML.matchAll(/^(?:let|var) ([A-Za-z_$][\w$]*)/gm), (m) => m[1])),
    constants: [...run(sandbox, 'DIAGRAM_SHOW_NAMES'), ...run(sandbox, 'MAP_PARTS')]
  };
}

test('every input of the drawing is in the address or on the list of the exceptions, and the writer names the parameter that carries it', async () => {
  const { sources, writers, topLevel, constants } = await sandboxSources();
  const problems = audit(sources, writers, topLevel, constants);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('the audit finds an input that nobody classified (a throw-away input read by the key of the cache)', async () => {
  const { sources, writers, topLevel, constants } = await sandboxSources();
  const withOne = sources.map((s) =>
    s.startsWith('function diagramCacheKey') ? s.replace('return (', 'return (AppState.throwAway, ') : s
  );
  const problems = audit(withOne, writers, topLevel, constants);
  assert.ok(
    problems.some((p) =>
      /^AppState\.throwAway is read by the drawing and is on neither list: add it to the address \(currentRouteHash\) or give the reason it is not there$/.test(
        p
      )
    ),
    problems.join('\n')
  );
});

test('the audit finds a parameter the table promises and the writer does not write', async () => {
  const { sources, writers, topLevel, constants } = await sandboxSources();
  const problems = audit(
    sources,
    writers.map((w) => w.replace(/'compare='/g, "'nothing='")),
    topLevel,
    constants
  );
  assert.ok(
    problems.some((p) => /compare= according to the table/.test(p)),
    problems.join('\n')
  );
});

test('every row of the table is read by at least one of the sources (a row that nothing reads is out of date)', async () => {
  const { sources, topLevel } = await sandboxSources();
  const read = inputsRead(sources, topLevel);
  const stale = Object.keys(INPUTS).filter((name) => !read.has(name));
  assert.deepEqual(stale, [], 'rows no source reads: ' + stale.join(', '));
});
