'use strict';
// The delete of a plateau that was allowed is written byte for byte as the released editor writes it (wave 019, run 0139, issue #138, decision T4: the checks of the run
// refuse more, and change nothing of what a delete that passes them writes). The page of the tag `archicode-0.17.0` (read with `git show`) and the page of this tree delete,
// from the dialog, every plateau but the root of copies of the layered Brightcart (src/test/resources/brightcart/layered/, with and without the views and stories of
// `shared/`), and of copies with a plateau put in the middle (one that loses nothing, one that loses elements); both say the same plateaus can be deleted, and the files on
// disk after "Save all changes" (their text, and the files removed) are the same. The deletes the new checks refuse are in replaces-and-delete-checks.test.js. Without the
// history of the repository (no tag), the test is skipped and says why.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const REPO = path.resolve(__dirname, '../../../..');
const TAG = 'archicode-0.17.0';
let released = null;
let unavailable = null;
try {
  released = execFileSync('git', ['show', TAG + ':src/main/resources/editor-webapp/standalone.html'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore']
  });
} catch (e) {
  unavailable = 'the page of ' + TAG + ' cannot be read with git show (no history or no tag in this checkout)';
}

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}
const SHIPPED = walk(LAYERED, LAYERED, {});
const BRIGHTCART = Object.fromEntries(Object.entries(SHIPPED).filter(([file]) => !file.startsWith('shared/')));
const PLATEAU = (id, rest) =>
  'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (rest || '');
const ELEMENT = (kind, plateau, body) =>
  'header:\n  kind: "archicode.morin.io/' + kind + '"\n  version: "1"\n  plateau: ' + plateau + '\ncontent:\n' + body;
// an empty plateau between inhouse and marketplace, and one between baseline and saas: deleting either loses nothing
const EMPTY_MIDDLE = Object.assign({}, BRIGHTCART, {
  'pilot/plateau.yaml': PLATEAU('pilot', '  name: "Pilot"\n  override: "inhouse"\n'),
  'marketplace/plateau.yaml': BRIGHTCART['marketplace/plateau.yaml'].replace(
    'override: "inhouse"',
    'override: "pilot"'
  ),
  'trial/plateau.yaml': PLATEAU('trial', '  name: "Trial"\n'),
  'saas/plateau.yaml': BRIGHTCART['saas/plateau.yaml'].replace(
    '  horizon: "2026-Q4"\n',
    '  horizon: "2026-Q4"\n  override: "trial"\n'
  )
});
// a plateau in the middle that declares elements, sets a description and removes an element: marketplace loses and gets back, and nothing it draws refuses the delete
const FULL_MIDDLE = Object.assign({}, BRIGHTCART, {
  'pilot/plateau.yaml': PLATEAU(
    'pilot',
    '  name: "Loyalty pilot"\n  override: "inhouse"\n  patches:\n    - operator: SET\n      target: "carrier"\n      field: description\n      value: "Books parcels in the pilot."\n    - operator: REMOVE\n      target: "tax"\n'
  ),
  'pilot/application/loyalty.yaml': ELEMENT('system', 'pilot', '  id: "loyalty"\n  name: "Loyalty scheme"\n'),
  'pilot/technology/lab.yaml': ELEMENT('environment', 'pilot', '  id: "lab"\n  name: "Pilot lab"\n'),
  'marketplace/plateau.yaml': BRIGHTCART['marketplace/plateau.yaml'].replace('override: "inhouse"', 'override: "pilot"')
});

// the page of the tag still opens `workspace.yaml` (the file was renamed `.archicode.yaml` in wave 019, run 0144, #133): its copy of the folder has the former name,
// and the files it saves are put back under the new one before they are compared
const FORMER = 'workspace.yaml';
const NEW = '.archicode.yaml';
const renamed = (files, from, to) =>
  Object.fromEntries(Object.entries(files).map(([p, text]) => [p === from ? to : p, text]));
async function open(html, files) {
  const mem = memFolder(html === null ? files : renamed(files, NEW, FORMER));
  const sandbox = createApp(html === null ? {} : { html });
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state, mem };
}

/** Deletes `id` from its dialog (and says yes to a second dialog, if one asks) and saves: `{ allowed, files, removed }`, or `{ allowed: false }` when the plan refuses it. */
async function deleted(html, files, id) {
  const { sandbox, state, mem } = await open(html, files);
  const plan = sandbox.plateauDeletion(id);
  if (plan.refusal || plan.breaks.length || plan.blocking.length) return { allowed: false };
  sandbox.openPlateauDeleteDialog(id);
  sandbox.submitAppDialog({ fields: {} });
  if (run(sandbox, 'appDialog && appDialog.kind') === 'layer-confirm') sandbox.submitAppDialog({});
  assert.equal(run(sandbox, 'appDialog'), null, id + ': no dialog is left open');
  assert.equal(state.plateauTree.nodes.has(id), false, id + ' is deleted');
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success', id + ': saved');
  const saved = Object.fromEntries(Array.from(mem.files, ([p, f]) => [p, f.text]));
  return {
    allowed: true,
    files: html === null ? saved : renamed(saved, FORMER, NEW),
    removed: plain(mem.removals)
      .map((p) => (html === null || p !== FORMER ? p : NEW))
      .sort()
  };
}

for (const [name, files, expected] of [
  ['the layered Brightcart without shared/', BRIGHTCART, { inhouse: false, marketplace: true, saas: true }],
  ['the layered Brightcart as shipped', SHIPPED, { inhouse: false, marketplace: false, saas: false }],
  [
    'the layered Brightcart with an empty plateau in the middle of each branch',
    EMPTY_MIDDLE,
    { inhouse: false, pilot: true, marketplace: true, trial: true, saas: true }
  ],
  [
    'the layered Brightcart with a plateau in the middle that loses elements',
    FULL_MIDDLE,
    { inhouse: false, pilot: true, marketplace: true, saas: true }
  ]
]) {
  test(
    name +
      ': every plateau is deleted, or refused, as the page of ' +
      TAG +
      ' does, and the files saved are the same bytes',
    { skip: unavailable || false },
    async () => {
      const ids = plain((await open(null, files)).state.plateauTree.ids).filter((id) => id !== 'baseline');
      assert.deepEqual(ids.slice().sort(), Object.keys(expected).sort());
      for (const id of ids) {
        const now = await deleted(null, files, id);
        const then = await deleted(released, files, id);
        assert.equal(now.allowed, expected[id], id + ': allowed by this page');
        assert.equal(then.allowed, expected[id], id + ': allowed by the page of ' + TAG);
        if (!now.allowed) continue;
        assert.deepEqual(now.removed, then.removed, id + ': the same files removed');
        assert.deepEqual(Object.keys(now.files).sort(), Object.keys(then.files).sort(), id + ': the same files left');
        for (const p of Object.keys(now.files))
          assert.equal(now.files[p], then.files[p], id + ': ' + p + ' is the same bytes');
        assert.ok(now.removed.length > 0, id + ': its files are removed');
      }
    }
  );
}
