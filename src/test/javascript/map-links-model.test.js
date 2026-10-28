'use strict';
// The entry model of the `links` of a Map view (wave 026, run 0199, issue #143, TDD DEC-2): one pure part, `model/map-links.js`, says what an entry is, which relationship it names, whether it
// names one in a model, how it is rewritten and in which order it is written. The label rule is the command line's and the kernel's (`RelationshipLabel.normalize`: trimmed, and a blank label
// is no label), and the cases are the ones of the kernel, src/test/javascript/viewpoint-kernel/map-links-cases.json (the `exists` flags that the Java test reads too).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./viewpoint-kernel/harness');
const { CASES, entry, indexOfCaseWorkspace, run, plain } = require('./map-links-support');

/** Calls a function of the page with JSON arguments (a function declaration of the classic script is a global of the sandbox). */
const call = (sandbox, name, ...args) =>
  plain(run(sandbox, name + '(' + args.map((a) => JSON.stringify(a)).join(', ') + ')'));

test('the key of an entry is the source, the destination and the trimmed label, and none for no label', () => {
  const sandbox = createApp({});
  assert.equal(call(sandbox, 'linkEntryKey', entry('a', 'b', 'calls')), JSON.stringify(['a', 'b', 'calls']));
  assert.equal(call(sandbox, 'linkEntryKey', entry('a', 'b', '  calls ')), JSON.stringify(['a', 'b', 'calls']));
  assert.equal(call(sandbox, 'linkEntryKey', entry('a', 'b')), JSON.stringify(['a', 'b', '']));
  assert.equal(
    call(sandbox, 'linkEntryKey', entry('a', 'b', '   ')),
    JSON.stringify(['a', 'b', '']),
    'a blank label is no label'
  );
  assert.notEqual(
    call(sandbox, 'linkEntryKey', entry('a', 'b', 'x')),
    call(sandbox, 'linkEntryKey', entry('b', 'a', 'x'))
  );
});

test('an entry is built from the relationship of a record: the label as written, trimmed, absent when there is none', () => {
  const sandbox = createApp({});
  const rel = (rawLabel, label) => ({ destination: 'b', rawLabel, label, qualifiers: [], tags: {}, fileIndex: 0 });
  assert.deepEqual(call(sandbox, 'linkEntryOf', rel(' reads ', ' reads '), 'a'), entry('a', 'b', 'reads'));
  const none = call(sandbox, 'linkEntryOf', rel(null, 'depends on'), 'a');
  assert.deepEqual(none, entry('a', 'b'), 'the display fallback is not a label');
  assert.equal('label' in none, false);
  assert.equal('label' in call(sandbox, 'linkEntryOf', rel('   ', '   '), 'a'), false, 'a blank label is no label');
});

test('entries are read as the kernel reads them: a list of mappings with a source, a destination and an optional label', () => {
  const sandbox = createApp({});
  const good = [entry('a', 'b', 'x'), entry('c', 'd')];
  assert.deepEqual(call(sandbox, 'linkEntriesOf', good), { entries: good, problems: [] });
  assert.deepEqual(call(sandbox, 'linkEntriesOf', undefined), { entries: [], problems: [] });
  assert.deepEqual(call(sandbox, 'linkEntriesOf', null), { entries: [], problems: [] });
  assert.deepEqual(call(sandbox, 'linkEntriesOf', []), { entries: [], problems: [] });
});

test('an entry of another shape is one sentence, the command line’s without the view and the word error', () => {
  const sandbox = createApp({});
  const shape = ']` is a mapping with `source`, `destination` and optionally `label`, and ';
  for (const [bad, index, list] of [
    [{ source: 'a', destination: 'b', lable: 'x' }, 0, [{ source: 'a', destination: 'b', lable: 'x' }]],
    [{ source: 'a' }, 1, [entry('a', 'b'), { source: 'a' }]],
    [{ source: 'a', destination: 'b', label: 5 }, 0, [{ source: 'a', destination: 'b', label: 5 }]],
    [{ source: '', destination: 'b' }, 0, [{ source: '', destination: 'b' }]],
    ['a -> b', 0, ['a -> b']]
  ]) {
    const { problems } = call(sandbox, 'linkEntriesOf', list);
    assert.equal(problems.length, 1, JSON.stringify(bad));
    assert.equal(problems[0], '`links[' + index + shape + JSON.stringify(bad) + ' is not one', JSON.stringify(bad));
  }
});

test('highlight is read with the same shape, and the sentence names the key that was read', () => {
  const sandbox = createApp({});
  const { problems } = call(sandbox, 'linkEntriesOf', [{ source: 'a' }], 'highlight');
  assert.match(problems[0], /^`highlight\[0\]` is a mapping with `source`, `destination` and optionally `label`, and /);
});

test('an entry exists when its source declares a relationship to its destination with the same label after trimming', () => {
  const sandbox = createApp({});
  let checked = 0;
  for (const c of CASES.cases) {
    if (!Array.isArray(c.exists)) continue;
    const index = indexOfCaseWorkspace(CASES.workspaces[c.workspace]);
    c.input.links.forEach((candidate, i) => {
      const asMap = JSON.stringify(Array.from(index.entries()));
      const got = plain(run(sandbox, 'linkEntryExists(' + JSON.stringify(candidate) + ', new Map(' + asMap + '))'));
      assert.equal(got, c.exists[i], c.name + ' entry ' + i);
      checked++;
    });
  }
  assert.ok(checked >= 27, 'the cases of the kernel were read, got ' + checked);
});

test('an entry exists in the exact source only, not in what it holds, and an unknown source names nothing', () => {
  const sandbox = createApp({});
  const index = indexOfCaseWorkspace(CASES.workspaces.basic);
  const asMap = JSON.stringify(Array.from(index.entries()));
  const exists = (e) => run(sandbox, 'linkEntryExists(' + JSON.stringify(e) + ', new Map(' + asMap + '))');
  assert.equal(exists(entry('sys.a', 'sys.b', 'feeds')), true);
  assert.equal(exists(entry('sys', 'other', 'calls')), false);
  assert.equal(exists(entry('nope', 'sys.b')), false);
  assert.equal(exists(entry('sys.a', 'sys.b', 'reads')), false);
});

test('a rewrite changes the source and the destination with the function it is given, and tells whether anything changed', () => {
  const sandbox = createApp({});
  sandbox.__rename = (value) => (value === 'shop.web' ? 'shop.site' : value === 'shop' ? 'store' : value);
  const entries = [entry('shop.web', 'shop.api', 'calls'), entry('customer', 'shop.web'), entry('x', 'y', 'z')];
  const changed = run(sandbox, 'rewriteLinkEntries(' + JSON.stringify(entries) + ', __rename)');
  assert.equal(changed, true);
  // the function mutates the entries it is given, as `rewriteRecipeReferences` mutates the properties
  const live = run(
    sandbox,
    '(() => { const e = ' + JSON.stringify(entries) + '; rewriteLinkEntries(e, __rename); return e; })()'
  );
  assert.deepEqual(plain(live), [
    entry('shop.site', 'shop.api', 'calls'),
    entry('customer', 'shop.site'),
    entry('x', 'y', 'z')
  ]);
  assert.equal(
    run(sandbox, 'rewriteLinkEntries(' + JSON.stringify([entry('x', 'y')]) + ', __rename)'),
    false,
    'nothing named: nothing changed'
  );
  const kept = run(
    sandbox,
    '(() => { const e = ' +
      JSON.stringify([entry('shop.web', 'b', ' lbl ')]) +
      '; rewriteLinkEntries(e, __rename); return e[0].label; })()'
  );
  assert.equal(kept, ' lbl ', 'the label never changes with a rename');
});

test('the canonical form sorts by key and drops a repeated entry', () => {
  const sandbox = createApp({});
  const entries = [
    entry('b', 'c', 'x'),
    entry('a', 'z'),
    entry('b', 'c', ' x '),
    entry('a', 'b', 'y'),
    entry('a', 'z', '   ')
  ];
  const canonical = call(sandbox, 'canonicalLinkEntries', entries);
  const keys = canonical.map((e) => JSON.stringify([e.source, e.destination, (e.label || '').trim()]));
  assert.deepEqual(keys, keys.slice().sort(), 'sorted by key');
  assert.equal(new Set(keys).size, keys.length, 'one entry per key');
  assert.equal(canonical.length, 3);
  assert.equal(
    canonical.every((e) => !('label' in e) || (e.label.trim() === e.label && e.label !== '')),
    true,
    'a label is written trimmed and a blank one not at all'
  );
  assert.deepEqual(call(sandbox, 'canonicalLinkEntries', []), []);
});

test('the part defines the six functions of the model', () => {
  const sandbox = createApp({});
  assert.equal(typeof sandbox.linkEntryOf, 'function');
  assert.equal(typeof sandbox.linkEntryKey, 'function');
  assert.equal(typeof sandbox.linkEntriesOf, 'function');
  assert.equal(typeof sandbox.linkEntryExists, 'function');
  assert.equal(typeof sandbox.rewriteLinkEntries, 'function');
  assert.equal(typeof sandbox.canonicalLinkEntries, 'function');
});
