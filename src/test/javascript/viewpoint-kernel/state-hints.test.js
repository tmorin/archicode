'use strict';
// A state word written by hand that the comparison does not give the element is told in the editor (run 0054, issue 36), with the sentences of the
// command line. `StateTagRuleTest.java` checks the command line against src/test/resources/state-hints/expected-sentences.txt on the
// invented library of src/test/resources/plateau-state-hints; this test checks the editor against the same file on the same files, so the two cannot drift.
// The page tells it in two places: the inspection of the element (where an author looks at a box that is not drawn as its word says) and the Hand-written states
// list of the Changes panel (one line per element and word, as the command line prints them).
// The harness has no DOM and no ELK: the kernel is the real embedded module.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const FIXTURE = path.resolve(__dirname, '../../resources/plateau-state-hints');
const EXPECTED = fs.readFileSync(path.resolve(__dirname, '../../resources/state-hints/expected-sentences.txt'), 'utf8').split('\n').filter(Boolean);
const plain = (value) => JSON.parse(JSON.stringify(value));
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

/** The editor on the invented library, `after` drawn, compared with `before` when `compare` is true. */
async function open(compare) {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(FIXTURE);
  state.folder = { handle, name: 'plateau-state-hints' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  await sandbox.loadViewpointKernel();
  await sandbox.switchPlateau('after');
  if (compare) await sandbox.setCompareTo('before');
  return { sandbox, state };
}

const inspection = (sandbox, reference, layer) => sandbox.inspectionPanelHtml({ kind: 'element', key: reference, layer: layer || 'application', mode: 'view' }, 'map');

test('the editor tells, word for word, what the command line tells, for every state word and both layers', async () => {
  const { sandbox } = await open(true);
  const hints = sandbox.stateWordHintsOf(sandbox.comparisonState());
  assert.deepEqual(plain(hints.map((hint) => hint.sentence)), EXPECTED);
  // the fixture says each of the seven words, some as a qualifier, in both layers: the file proves every case, not only the first
  const said = new Set(hints.map((hint) => hint.word));
  for (const word of ['new', 'changed', 'removed', 'moved', 'split', 'merged', 'contains-changes']) assert.ok(said.has(word), word + ' is said by the fixture');
  assert.ok(EXPECTED.some((s) => s.includes('(qualifier)')) && EXPECTED.some((s) => s.includes('`rendering-stereotypes` tag)')));
  assert.ok(hints.some((hint) => hint.layer === 'technology') && hints.some((hint) => hint.layer === 'application'));
});

test('the inspection of an element says it, and only for the words that disagree', async () => {
  const { sandbox } = await open(true);
  // the desk did not change and carries `new` (a qualifier) and `moved`: two sentences
  const desk = inspection(sandbox, 'library.desk');
  const deskHints = EXPECTED.filter((s) => s.startsWith('the element `library.desk` '));
  assert.equal(deskHints.length, 2);
  for (const sentence of deskHints) assert.ok(text(desk).includes(sentence), sentence);
  // the kiosk is new and carries `new split`: the agreeing word is not told, the other one is
  const kiosk = text(inspection(sandbox, 'library.kiosk'));
  assert.ok(kiosk.includes('carries `split`'));
  assert.ok(!kiosk.includes('carries `new`'));
  // the catalog carries `changed contains-changes` and holds a change: only `changed` is told
  const catalog = text(inspection(sandbox, 'library.catalog'));
  assert.ok(catalog.includes('carries `changed`') && !catalog.includes('carries `contains-changes`'));
  // a technology element: the same sentence
  assert.ok(text(inspection(sandbox, 'prod.cluster', 'technology')).includes(EXPECTED.find((s) => s.includes('`prod.cluster`'))));
  // the report that agrees with its word (split) and the room that agrees (merged, after the qualifier that does not): nothing for the agreeing ones
  assert.ok(!text(inspection(sandbox, 'library.report-a')).includes('carries'));
  assert.ok(text(inspection(sandbox, 'library.room')).includes('carries `changed` (qualifier)'));
  assert.ok(!text(inspection(sandbox, 'library.room')).includes('carries `merged`'));
});

test('the Changes panel lists them in a section of their own, and counts them', async () => {
  const { sandbox } = await open(true);
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  assert.ok(!panel.includes('changes-warnings-section'), 'the warnings of the kernel are another list, and this fixture has none');
  const start = panel.indexOf('class="changes-state-words"');
  assert.ok(start > 0);
  const section = panel.slice(start, panel.indexOf('</section>', start));
  assert.ok(section.includes('Hand-written states <span class="field-count">' + EXPECTED.length + '</span>'), section.slice(0, 300));
  const items = Array.from(section.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)).map((m) => text(m[1]));
  assert.deepEqual(items, EXPECTED);
});

test('the wording toggle does not change what is told: the words are compared with the whole comparison', async () => {
  const { sandbox, state } = await open(true);
  const before = sandbox.stateWordHintsOf(sandbox.comparisonState()).map((hint) => hint.sentence);
  // the loans changed by their description only: with wording hidden they are drawn as they were, and the comparison still says they changed
  state.hideWording = true;
  vm.runInContext('AppState.hideWording = true;', sandbox);
  const quiet = sandbox.comparisonState();
  assert.equal(quiet.records.get('application|library.loans').change, 'none', 'the loans are set aside, the drawing has them unchanged');
  assert.deepEqual(plain(sandbox.stateWordHintsOf(quiet).map((hint) => hint.sentence)), plain(before));
});

test('without a comparison nothing is told (the page has nothing to compare the words with)', async () => {
  const { sandbox } = await open(false);
  assert.deepEqual(plain(sandbox.stateWordHintsOf(sandbox.comparisonState())), []);
  assert.ok(!text(inspection(sandbox, 'library.desk')).includes('carries'));
  assert.equal(sandbox.renderStateWordHintsHtml('application', 'library.desk'), '');
});

test('a comparison that cannot be drawn tells nothing, and an element that carries no state word is not told', async () => {
  const { sandbox } = await open(true);
  assert.deepEqual(plain(sandbox.stateWordHintsOf(null)), []);
  assert.deepEqual(plain(sandbox.stateWordHintsOf({ problems: ['x'] })), []);
  assert.deepEqual(plain(sandbox.stateWordHintsOf({ pending: true })), []);
  assert.equal(sandbox.renderStateWordHintsHtml('application', 'library.report-a'), '');
});
