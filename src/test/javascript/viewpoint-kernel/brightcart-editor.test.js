'use strict';
// Brightcart (wave 012, run 0061): the editor on the invented shopping solution of docs/fixtures/brightcart-spec.md (sections 10 and 11), read from
// src/test/resources/brightcart/layered/ (the plateaus are layers). Three things, each against the answers the generator wrote in expected/ and not against numbers typed here:
//   - the editor draws each of the four plateaus and finds the sizes of the document;
//   - the Changes panel of each comparison that a tool can say today (P1 to P5) shows the counts `archicode diff` prints (BrightcartLayeredDiffTest.java reads the same file);
//   - the save keeps what an edit does not touch (the line-preserving save of run 0055 and wave 011): every file of `layered/` (61 files, the views and the stories among them) is
//     saved as it was when nothing changed, an edit of its name changes its name line and no other, an addition keeps every line it had; and the editor itself
//     writes a rename in the manifests a plateau declares and writes it back to the bytes of the file on the disk.
// brightcart-layered.test.js opens the same folder and says what the editor reads of it.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');
const { memFolder } = require('./mem-folder');

const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart');
const LAYERED = path.join(BRIGHTCART, 'layered');
const expected = (name) => JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'expected', name + '.json'), 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value));

const SIZES = expected('sizes').plateaus;
const COMPARISONS = expected('comparisons').filter((c) => c.verified === 'archicode diff');
const ALL_COMPARISONS = expected('comparisons');
const RENDITIONS = expected('renditions');

/** Every `.yaml` file below `root`, as a path relative to it with `/`, sorted. */
function yamlFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.yaml')) out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(root);
  return out.sort();
}

async function openLayered(options = {}) {
  const sandbox = createApp(options);
  const state = sandbox.__state();
  const handle = options.handle || makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  await sandbox.loadViewpointKernel();
  return { sandbox, state };
}

// ---- the four plateaus ----

test('the editor has the four plateaus of the document in its tree, the root drawn when none is asked for', async () => {
  const { state } = await openLayered();
  assert.deepEqual(plain([...state.plateauTree.nodes.keys()].sort()), Object.keys(SIZES).sort());
  assert.equal(state.layers.current, 'baseline');
});

for (const id of Object.keys(SIZES)) {
  test('plateau ' + id + ': the editor draws it with the elements and the relationships of the document', async () => {
    const { sandbox, state } = await openLayered();
    sandbox.drawPlateau(id);
    assert.equal(state.fatalError, null);
    assert.equal(state.layers.current, id);
    const want = SIZES[id];
    assert.equal(state.index.application.size, want.application);
    assert.equal(state.index.technology.size, want.technology);
    assert.equal(state.index.application.size + state.index.technology.size, want.elements);
    const relationships = sandbox
      .toKernelElements(state.index.application, true)
      .elements.reduce((n, e) => n + (e.relationships || []).length, 0);
    assert.equal(relationships, want.relationships);
    assert.deepEqual(plain(state.duplicateReferences), []);
    assert.deepEqual(
      plain(state.manifestFiles.map((f) => f.relPath).sort()),
      yamlFiles(LAYERED).filter((f) => f !== '.archicode.yaml'),
      'every manifest of the folder is read, whatever the plateau drawn'
    );
  });
}

// ---- the Changes panel ----

/** The counts the panel shows in its chips: `{ elements: { new, changed, ... }, relationships: { ... } }`. */
function panelCounts(html) {
  const rows = html.split('class="changes-count-row"').slice(1, 3);
  const read = (row) => {
    const counts = {};
    for (const match of row.matchAll(/data-state="([a-z-]+)"[^>]*>.*?<span class="change-count">(\d+)<\/span>/g))
      counts[match[1]] = Number(match[2]);
    return counts;
  };
  return { elements: read(rows[0]), relationships: read(rows[1]) };
}

/** The number a list of the panel announces: `Elements <span class="field-count">N</span>`. */
function listedRows(html, title) {
  const match = html.match(
    new RegExp('<h4 class="inspection-subhead">' + title + ' <span class="field-count">(\\d+)</span>')
  );
  assert.ok(match, title + ' list is in the panel');
  return Number(match[1]);
}

for (const comparison of COMPARISONS) {
  test(
    comparison.id + ': the Changes panel of ' + comparison.comparison + ' has the counts of archicode diff',
    async () => {
      const { sandbox, state } = await openLayered();
      const base = comparison.chain[0],
        target = comparison.chain[comparison.chain.length - 1]; // P4 is two steps apart: the plateau in between is not asked for
      sandbox.drawPlateau(target);
      sandbox.compareWithPlateau(base);
      assert.equal(state.layers.current, target);
      assert.equal(state.baseline.plateau.id, base);
      const view = sandbox.comparisonState();
      assert.equal(view.problems, undefined, JSON.stringify(view.problems));
      assert.equal(
        view.warnings.length,
        comparison.ignoredReplaces,
        'what the kernel ignored in `replaces`, as the tool prints it'
      );
      const html = sandbox.renderChangesPanelHtml(view);
      const counts = panelCounts(html);
      assert.deepEqual(
        plain({ new: counts.elements.new, changed: counts.elements.changed, removed: counts.elements.removed }),
        comparison.elements
      );
      // moved, split and merged are chips only when there is one
      assert.deepEqual(
        { moved: counts.elements.moved || 0, split: counts.elements.split || 0, merged: counts.elements.merged || 0 },
        comparison.replacing
      );
      assert.deepEqual(counts.relationships, comparison.relationships);
      // the lists under the counts have one row per thing counted
      const sum = (c) => Object.values(c).reduce((a, b) => a + b, 0);
      assert.equal(listedRows(html, 'Elements'), sum(comparison.elements) + sum(comparison.replacing));
      assert.equal(listedRows(html, 'Relationships'), sum(comparison.relationships));
      assert.match(html, /compared with/);
    }
  );
}

test('P4 is asked of the editor as the model answers it: marketplace compared with baseline, two steps apart, composes the replaces of inhouse (wave 017, issue #89)', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('marketplace');
  sandbox.compareWithPlateau('baseline');
  const p4 = ALL_COMPARISONS.find((c) => c.id === 'P4');
  const elements = sandbox.comparisonState().counts.elements;
  assert.deepEqual(
    {
      new: elements.new,
      changed: elements.changed,
      removed: elements.removed,
      moved: elements.moved,
      split: elements.split,
      merged: elements.merged
    },
    { ...p4.elements, ...p4.replacing },
    "the model's numbers: +38 ~3 -6, 11 moved"
  );
  const view = sandbox.comparisonState();
  assert.deepEqual(plain(view.warnings), [], 'the chain explains the entry that names commerce.search');
  assert.equal(view.records.get('application|discovery.search').change, 'moved');
  assert.deepEqual(
    plain(view.records.get('application|discovery.search').replaces),
    ['shop.app.search'],
    'the composed word'
  );
  assert.equal(state.layers.current, 'marketplace');
});

// ---- the save: every manifest of the complete-folder rendition ----

const LAYERED_FILES = yamlFiles(LAYERED).filter((f) => f !== '.archicode.yaml');
const app = createApp({});
const parse = (text) => plain(app.parseYaml(text));

test('the rendition is the files the document counts', () => {
  {
    const [name, root, files] = ['layered', LAYERED, LAYERED_FILES];
    const texts = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
    assert.equal(files.length, RENDITIONS[name].files, name + ' files');
    assert.equal(
      texts.reduce((n, t) => n + t.split('\n').length - 1, 0),
      RENDITIONS[name].lines,
      name + ' lines'
    );
    assert.equal(
      texts.reduce((n, t) => n + Buffer.byteLength(t), 0),
      RENDITIONS[name].bytes,
      name + ' bytes'
    );
  }
  // the layered rendition: a Plateau manifest per plateau, the views and the stories (run 0110, in the folder `shared/`, which no plateau owns), and the rest are manifests of elements;
  // the patches are counted in the Plateau manifests
  assert.equal(LAYERED_FILES.filter((f) => f.endsWith('/plateau.yaml')).length, RENDITIONS.layered.plateauFiles);
  assert.equal(LAYERED_FILES.filter((f) => /^shared\/view\./.test(f)).length, RENDITIONS.layered.views);
  assert.equal(LAYERED_FILES.filter((f) => /^shared\/story\./.test(f)).length, RENDITIONS.layered.stories);
  assert.equal(
    LAYERED_FILES.filter((f) => f.startsWith('shared/')).length,
    RENDITIONS.layered.views + RENDITIONS.layered.stories,
    'the folder `shared/` holds the views and the stories and nothing else'
  );
  assert.equal(
    LAYERED_FILES.length - RENDITIONS.layered.plateauFiles - RENDITIONS.layered.views - RENDITIONS.layered.stories,
    RENDITIONS.layered.manifests
  );
  const patches = LAYERED_FILES.filter((f) => f.endsWith('/plateau.yaml')).reduce(
    (n, f) => n + (parse(fs.readFileSync(path.join(LAYERED, f), 'utf8')).content.patches || []).length,
    0
  );
  assert.equal(patches, RENDITIONS.layered.patches);
});

/** `value` with the name of its content set to `name`: what an edit of the name saves. */
const renamed = (text, name) => {
  const value = parse(text);
  value.content.name = name;
  return app.patchYamlText(text, value);
};

for (const [rendition, root, files] of [['layered', LAYERED, LAYERED_FILES]]) {
  test(
    'save, ' +
      rendition +
      ': a file read and written back with no edit is the file, byte for byte (' +
      files.length +
      ' files)',
    () => {
      for (const file of files.concat(['.archicode.yaml'])) {
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        assert.equal(app.patchYamlText(text, parse(text)), text, file);
      }
    }
  );

  test(
    'save, ' +
      rendition +
      ': an edit of the name changes the line of the name and no other, and putting it back gives the file back',
    () => {
      for (const file of files) {
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        const before = text.split('\n');
        const original = parse(text).content.name;
        assert.equal(typeof original, 'string', file + ' has a name');
        const edited = renamed(text, original + ' (edited)');
        const after = edited.split('\n');
        assert.equal(after.length, before.length, file);
        const different = before.map((line, i) => (line === after[i] ? -1 : i)).filter((i) => i >= 0);
        assert.equal(different.length, 1, file + ': ' + different.join(','));
        assert.ok(before[different[0]].trimStart().startsWith('name: '), file + ': ' + before[different[0]]);
        assert.equal(parse(edited).content.name, original + ' (edited)', file + ' reads back');
        assert.equal(renamed(edited, original), text, file + ' put back');
      }
    }
  );

  test(
    'save, ' + rendition + ': a tag added to the root only adds lines, every line the file had stays in its place',
    () => {
      for (const file of files) {
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        const value = parse(text);
        value.content.tags = Object.assign({}, value.content.tags, { reviewed: 'yes' });
        const out = app.patchYamlText(text, value);
        assert.deepEqual(parse(out), value, file + ' reads back');
        const kept = out.split('\n');
        let at = 0;
        for (const line of text.split('\n')) {
          // a flow list or map the edit reaches is rewritten (in brackets again when it fits, else as a block; #54, #145): the lines of the original that do not come back are the ones of such a collection, never another
          const found = kept.indexOf(line, at);
          if (found === -1)
            assert.ok(
              /[[{]/.test(line) || line.trim().startsWith('#') || line.trim() === '',
              file + ': lost "' + line + '"'
            );
          else at = found + 1;
        }
        assert.ok(out.split('\n').length > text.split('\n').length, file);
      }
    }
  );
}

/** `layered/` as a writable in-memory folder: the files as the generator wrote them. */
function layeredInMemory() {
  const initial = { '.archicode.yaml': fs.readFileSync(path.join(LAYERED, '.archicode.yaml'), 'utf8') };
  for (const f of LAYERED_FILES) initial[f] = fs.readFileSync(path.join(LAYERED, f), 'utf8');
  return { mem: memFolder(initial), initial };
}

for (const id of Object.keys(SIZES)) {
  test(
    'the editor saves a rename in every manifest that plateau ' +
      id +
      ' declares: one line per file, then writes the bytes of the disk back',
    async () => {
      const { mem, initial } = layeredInMemory();
      const { sandbox, state } = await openLayered({ handle: mem.handle });
      sandbox.drawPlateau(id);
      assert.equal(state.layers.current, id);
      // the elements the plateau declares: the manifests that say `plateau: <id>` (the root's say none), a plateau's own manifest and the views and stories excepted (which say none either)
      const declared = state.manifestFiles.filter(
        (mf) => (mf.header.plateau || 'baseline') === id && !/(plateau|view|story)$/.test(mf.header.kind)
      );
      const manifests = plain(declared.map((mf) => mf.relPath));
      assert.ok(manifests.length >= 3, id + ' declares its manifests');
      const edit = (suffix) => {
        for (const mf of declared) {
          const reference = mf.header.parent ? mf.header.parent + '.' + mf.content.id : String(mf.content.id);
          const layer = /environment$|node$/.test(mf.header.kind) ? 'technology' : 'application';
          sandbox.commitElementEdit(
            reference,
            (node) => {
              node.name = String(node.name).replace(/ \(edited\)$/, '') + suffix;
            },
            layer,
            { confirmed: true }
          );
        }
      };
      edit(' (edited)');
      await sandbox.saveAllChanges();
      assert.deepEqual(
        mem.writes.slice().sort(),
        manifests.slice().sort(),
        'every manifest the plateau declares was written, and nothing else'
      );
      for (const file of manifests) {
        const before = initial[file].split('\n');
        const after = mem.files.get(file).text.split('\n');
        assert.equal(after.length, before.length, file);
        const different = before.map((line, i) => (line === after[i] ? -1 : i)).filter((i) => i >= 0);
        assert.equal(different.length, 1, file + ': ' + different.join(','));
        assert.match(after[different[0]], /^\s*name: ".* \(edited\)"$/, file);
      }
      for (const file of Object.keys(initial)) {
        if (!manifests.includes(file)) assert.equal(mem.files.get(file).text, initial[file], file + ' is not touched');
      }
      mem.writes.length = 0;
      edit('');
      await sandbox.saveAllChanges();
      for (const file of Object.keys(initial))
        assert.equal(mem.files.get(file).text, initial[file], file + ' is as it was');
    }
  );
}
