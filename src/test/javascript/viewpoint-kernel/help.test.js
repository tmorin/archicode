'use strict';
// The help of the editor: links to the manual that is published with it, at anchors that must exist in the manual.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, openFixture } = require('./harness');

/** `const` and `let` of the page are not properties of its sandbox: read and write them from inside. */
const run = (sandbox, code) => vm.runInContext(code, sandbox);

const MANUAL = fs.readFileSync(path.resolve(__dirname, '../../../doc/README.adoc'), 'utf8');

test('every anchor of the manual that the editor links to is written in the manual', () => {
  const sandbox = createApp();
  const links = run(sandbox, 'DOC_LINKS');
  assert.ok(Object.keys(links).length > 5);
  for (const [key, anchor] of Object.entries(links)) {
    if (anchor === '') continue; // the manual itself
    assert.match(anchor, /^#[a-z-]+$/, key + ' is a plain anchor');
    assert.ok(MANUAL.includes('[[' + anchor.slice(1) + ']]'), key + ': the manual has no [[' + anchor.slice(1) + ']] anchor — a link of the editor would land on nothing');
  }
  assert.equal(sandbox.docUrl('manual'), 'https://tmorin.github.io/archicode/docs/');
  assert.equal(sandbox.docUrl('map'), 'https://tmorin.github.io/archicode/docs/#editor-map');
});

test('the manual describes the editor command, and the keys the editor answers to', () => {
  assert.match(MANUAL, /=== Serve the editor/);
  for (const flag of ['--port', '--host', '--allowed-host']) assert.ok(MANUAL.includes(flag), flag);
});

test('the help opens from the top panel, shows the manual and the version, and closes on a click elsewhere or Escape', async () => {
  const { sandbox, state } = await openFixture();
  state.folder = { name: 'ws' };
  assert.match(sandbox.renderTopPanelHtml(), /data-action="toggle-help"[^>]*aria-expanded="false"/);
  assert.equal(sandbox.renderHelpMenuHtml(), '', 'closed: nothing is drawn');
  const click = (action, inside) => {
    const target = action ? { getAttribute: (name) => (name === 'data-action' ? action : null) } : null;
    sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : inside && selector === '.help-menu' ? {} : null) }, preventDefault() {}, stopPropagation() {} });
  };
  click('toggle-help');
  assert.equal(run(sandbox, 'helpOpen'), true);
  const menu = sandbox.renderHelpMenuHtml();
  assert.match(menu, /role="dialog" aria-label="Help"/);
  assert.match(menu, /href="https:\/\/tmorin\.github\.io\/archicode\/docs\/#editor-keyboard" target="_blank" rel="noopener">Keyboard shortcuts</);
  assert.match(menu, /ArchiCode dev · kernel contract 4/, 'the release this page is, here the file of the repository');
  assert.match(menu, /Nothing is uploaded/);
  assert.match(menu, /in the folder you picked/, 'opened on its own, the editor says where the files are');
  click(null, true);
  assert.equal(run(sandbox, 'helpOpen'), true, 'a click inside the help leaves it open');
  click(null, false);
  assert.equal(run(sandbox, 'helpOpen'), false, 'a click elsewhere closes it');
  click('toggle-help');
  sandbox.handleHelpKeydown({ key: 'Escape' });
  assert.equal(run(sandbox, 'helpOpen'), false, 'so does Escape');
});

test('the version is the one the page was stamped with, and the help says where the files are when served', () => {
  const served = createApp({ serverToken: 't', fetch: async () => ({}) });
  run(served, 'helpOpen = true;');
  assert.match(served.renderHelpMenuHtml(), /archicode editor serve/);
  const sandbox = createApp();
  sandbox.document.querySelector = (selector) => (selector === 'meta[name="archicode-version"]' ? { getAttribute: () => '1.2.3' } : null);
  assert.equal(sandbox.editorVersion(), '1.2.3');
});

test('some texts of the settings point at the manual', async () => {
  const { sandbox } = await openFixture();
  assert.match(sandbox.renderHelpHtml('facetsIntro'), /href="https:\/\/tmorin\.github\.io\/archicode\/docs\/#facets" target="_blank" rel="noopener">Manual</);
  assert.match(sandbox.renderHelpHtml('manifestsPaths'), /#technical-configuration/);
  assert.doesNotMatch(sandbox.renderHelpHtml('viewsLabels'), /<a /, 'a text the manual does not explain further has no link');
});

test('the landing page links to the manual', () => {
  const sandbox = createApp();
  assert.match(sandbox.renderLandingHtml(sandbox.landingScreenConfig()), /href="https:\/\/tmorin\.github\.io\/archicode\/docs\/#editor"/);
});
