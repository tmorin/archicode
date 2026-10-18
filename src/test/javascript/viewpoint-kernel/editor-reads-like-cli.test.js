'use strict';
// The editor reads a manifest and workspace.yaml as the command line does (run 0072, issues #75 and #76): the same keys, the same kinds, the same
// shapes, in the same order, and the same sentence. The cases that both tools run are in src/test/resources/brightcart/negative-cases.json
// (BrightcartNegativeCasesTest.java and brightcart-negative.test.js read it); this file holds what is the editor's alone: the order of its checks,
// the kinds it accepts, the table it reads with, and the forms it must go on accepting because the command line does.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const app = createApp({});
const HEADER = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n';
const manifest = (content, header = HEADER) => header + 'content:\n' + content;
const errorOf = (text) => app.parseManifestText(text).error;
const KNOWN_KINDS =
  'archicode.morin.io/component, archicode.morin.io/container, archicode.morin.io/container-group, archicode.morin.io/environment, archicode.morin.io/node, archicode.morin.io/person, archicode.morin.io/plateau, ' +
  'archicode.morin.io/solution, archicode.morin.io/solution-group, archicode.morin.io/story, archicode.morin.io/system, archicode.morin.io/system-group, archicode.morin.io/view';

test('an unknown header.kind gives one sentence, with the value and the kinds there are (#76)', () => {
  assert.equal(errorOf(manifest('  id: s\n', 'header:\n  kind: "archicode.morin.io/persn"\n  version: "1"\n')), 'unrecognized `header.kind` "archicode.morin.io/persn" (known: ' + KNOWN_KINDS + ')');
  assert.equal(errorOf(manifest('  id: s\n', 'header:\n  kind: system\n  version: "1"\n')), 'unrecognized `header.kind` "system" (known: ' + KNOWN_KINDS + ')', 'the prefix is required, as the command line requires it');
  assert.equal(errorOf(manifest('  id: s\n', 'header:\n  kind: ""\n  version: "1"\n')), 'unrecognized `header.kind` "" (known: ' + KNOWN_KINDS + ')');
  assert.equal(errorOf(manifest('  id: s\n', 'header:\n  kind: [a]\n  version: "1"\n')), 'the value has the wrong shape (found an array) at `header.kind`');
});

test('a kind is read in any case and with spaces around it, as the command line reads it', async () => {
  assert.equal(errorOf(manifest('  id: s\n', 'header:\n  kind: "  ARCHICODE.Morin.IO/System "\n  version: "1"\n')), null);
  const mem = memFolder({ 'workspace.yaml': 'settings:\n  manifests:\n    paths: [m]\n', 'm/a.yaml': manifest('  id: s\n  name: S\n', 'header:\n  kind: "ARCHICODE.MORIN.IO/SYSTEM"\n  version: "1"\n') });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.manifestFiles[0].error, null);
  assert.deepEqual(Array.from(state.index.application.keys()), ['s']);
});

test('the checks come in the order the command line meets them: the file from the top, an object finished before the key it lacks is told (#77)', () => {
  const kind = (value) => '  kind: "archicode.morin.io/' + value + '"\n';
  // the kind and the plateau key are read like any other: the version that is missing is told at the end of the header
  assert.equal(errorOf('header:\n' + kind('plateau') + 'content:\n  id: s\n'), 'Missing header.version');
  assert.equal(errorOf('header:\n' + kind('system') + '  plateau: x\ncontent:\n  id: s\n'), 'Missing header.version');
  // an unknown key of the header comes before the version it lacks, a missing key after the keys that are there
  assert.equal(errorOf('header:\n' + kind('system') + '  foo: 1\ncontent:\n  id: s\n'), 'unknown key `foo` (known: kind, parent, plateau, version) at `header.foo`');
  assert.equal(errorOf('header:\n' + kind('system') + 'content:\n  id: s\n'), 'Missing header.version');
  // the content is read after the header, whichever comes first in the file, but a content of the wrong shape is met where it stands
  assert.equal(errorOf('content:\n  id: s\n  foo: 1\nheader:\n  kind: "archicode.morin.io/persn"\n  version: "1"\n'), 'unrecognized `header.kind` "archicode.morin.io/persn" (known: ' + KNOWN_KINDS + ')');
  assert.equal(errorOf('content: x\nheader:\n  foo: 1\n'), 'the value has the wrong shape (found a string) at `content`');
  assert.equal(errorOf('header:\n  foo: 1\ncontent: x\n'), 'unknown key `foo` (known: kind, parent, plateau, version) at `header.foo`');
  assert.equal(errorOf('content:\n  id: s\n  foo: 1\n'), 'Missing header.kind');
  // inside the content: the keys in the order of the file, then what an object lacks, an element finished before the next one starts
  assert.equal(errorOf(manifest('  foo: 1\n')), 'unknown key `foo` (known: description, elements, id, name, qualifiers, relationships, replaces, tags) at `foo`', 'an unknown key comes before the id that is missing');
  assert.equal(errorOf(manifest('  id: s\n  elements:\n    - kind: container\n      name: a\n    - kind: zzz\n')), 'Missing content.elements[0].id');
  assert.equal(errorOf(manifest('  id: s\n  elements:\n    - foo: 1\n      kind: container\n      id: a\n')), 'unknown key `foo` (known: description, elements, id, name, qualifiers, relationships, replaces, tags) at `elements[0].foo`');
  assert.equal(errorOf(manifest('  id: s\n  elements:\n    - foo: 1\n      id: a\n')), 'missing `kind` (known: container, group) at `elements[0]`', 'the kind of an element is met before its keys, wherever it is written');
});

test('a nested element says its kind is missing, not that it is unknown (#77)', () => {
  assert.equal(errorOf(manifest('  id: s\n  elements:\n    - id: c\n')), 'missing `kind` (known: container, group) at `elements[0]`');
  assert.equal(errorOf(manifest('  id: s\n  elements:\n    - kind: [a]\n      id: c\n')), 'missing `kind` (known: container, group) at `elements[0]`');
  assert.equal(errorOf(manifest('  id: s\n  elements:\n    - kind: component\n      id: c\n')), 'unknown kind `component` (known: container, group) at `elements[0]`', 'the kinds depend on the parent');
  assert.equal(errorOf(manifest('  id: s\n  elements:\n    - kind: Container\n      id: c\n')), 'unknown kind `Container` (known: container, group) at `elements[0]`', 'a nested kind is case sensitive');
});

test('the keys each kind takes are the keys of its class: a person takes no elements, an environment takes uses, a node takes applications', () => {
  const person = (extra) => manifest('  id: p\n' + extra, 'header:\n  kind: "archicode.morin.io/person"\n  version: "1"\n');
  assert.match(errorOf(person('  elements: []\n')), /^unknown key `elements` \(known: description, id, name, qualifiers, relationships, replaces, tags\) at `elements`$/);
  const environment = (extra) => manifest('  id: e\n' + extra, 'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\n');
  assert.equal(errorOf(environment('  uses: [a]\n')), null);
  assert.equal(errorOf(environment('  uses: a\n')), 'the value has the wrong shape (found a string) at `uses`');
  const node = (extra) => manifest('  id: n\n' + extra, 'header:\n  kind: "archicode.morin.io/node"\n  version: "1"\n');
  assert.equal(errorOf(node('  applications:\n    a: 1\n')), 'the value has the wrong shape (found an object) at `applications`');
});

test('a view needs its id and its viewpoint, ignores the keys it does not know, and reads its layer in any case', () => {
  const view = (content) => manifest(content, 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\n');
  assert.equal(errorOf(view('  id: v\n')), 'Missing content.viewpoint');
  assert.equal(errorOf(view('  id: v\n  viewpoint: p\n  foo: 1\n  layer: TECHNOLOGY\n  properties: {a: 1}\n')), null);
  assert.equal(errorOf(view('  id: v\n  viewpoint: p\n  layer: foo\n')), 'unrecognized `layer` "foo" (known: APPLICATION, TECHNOLOGY)');
});

test('what the command line accepts, the editor accepts', () => {
  // a number and a boolean are read as the text they are, an empty text is no number and no boolean, null is no value
  assert.equal(errorOf(manifest('  id: 5\n  name: 12\n  description: true\n  qualifiers: [a, 1, true]\n  tags:\n    a: 1\n    b: true\n    c:\n')), null);
  assert.equal(errorOf(manifest('  id: s\n  replaces: x\n')), null, 'what replaces holds is read by the comparison, not by the reader');
  assert.equal(errorOf(manifest('  id: s\n  kind: container\n')), null, 'the kind of the root is the one of the header');
  // a group at the root of a manifest is not read by the command line yet (tmorin/archicode#79): the editor does not check what it does not know
  assert.equal(errorOf(manifest('  id: g\n  foo: 1\n', 'header:\n  kind: "archicode.morin.io/system-group"\n  version: "1"\n')), null);
});

test('workspace.yaml: the keys and the shapes of the settings, the styles and the formatters are the command line\'s', () => {
  const problem = (text) => app.workspaceProblem(app.parseYaml(text));
  assert.equal(problem('settings:\n  name: Shop\n'), null);
  assert.equal(problem('settings:\n  foo: 1\n'), 'unknown key `foo` (known: current, facets, manifests, name, plateaus, relationships, views) at `settings.foo`');
  assert.equal(problem('foo: 1\n'), 'unknown key `foo` (known: application, formatters, settings, stories, story, styles, technology, view, views) at `foo`');
  assert.equal(problem('settings:\n  facets:\n    global-enabled: false\n    customs:\n      - name: a\n        hide-unlinked: true\n        actions:\n          - operator: REMOVE\n            json-path: "$"\n'), null, 'the other names of a key');
  assert.equal(problem('settings:\n  facets:\n    customs:\n      - name: a\n        actions:\n          - operator: REMOVE\n'), 'Missing settings.facets.customs[0].actions[0].jsonPath');
  assert.equal(problem('settings:\n  manifests:\n    paths: m\n'), 'the value has the wrong shape (found a string) at `settings.manifests.paths`');
  assert.equal(problem('settings:\n  views:\n    labels:\n      a: b\n    properties:\n      a: {x: 1}\n'), null);
  assert.equal(problem('styles:\n  composite:\n    line-style: x\n'), 'the value has the wrong shape (found a string) at `styles.composite.line-style`');
  assert.equal(problem('styles:\n  composite:\n    line-style: ""\n    shadowing: ""\n'), null, 'an empty text is no number and no boolean');
  assert.equal(problem('formatters:\n  link:\n    labl: x\n'), 'unknown key `labl` (known: label, qualifiers) at `formatters.link.labl`');
  assert.equal(problem('technology:\n  elements:\n    - kind: environment\n      id: e\n      elements:\n        - kind: node\n          id: n\n'), null);
  assert.equal(problem('technology:\n  elements:\n    - id: e\n'), 'missing `kind` (known: environment) at `technology.elements[0]`');
  assert.equal(problem('settings:\n  current: [a]\n'), 'the value has the wrong shape (found an array) at `settings.current`');
  assert.equal(problem('settings:\n  plateaus:\n    - id: a\n      path: p\n      colour: red\n'), null, 'the plateaus are checked by their own rules, which come first');
});

test('a workspace.yaml the editor refuses is a fatal error that says the sentence, and the folder is not opened', async () => {
  const mem = memFolder({ 'workspace.yaml': 'settings:\n  foo: 1\n' });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.fatalError, 'Could not read/parse workspace.yaml: unknown key `foo` (known: current, facets, manifests, name, plateaus, relationships, views) at `settings.foo`');
  assert.equal(state.workspace, null);
});

test('every type and every kind the table names is in the table, and every spec is one the reader knows', () => {
  const schema = JSON.parse(vm.runInContext('JSON.stringify(READ_SCHEMA)', app));
  const types = Object.keys(schema.types);
  const specs = new Set(['text', 'int', 'bool', 'any', 'texts', 'text-map', 'object-map']);
  for (const [name, def] of Object.entries(schema.types)) {
    if (def.extends) assert.ok(types.includes(def.extends), name + ' extends ' + def.extends);
    for (const [field, spec] of Object.entries(def.fields || {})) {
      const bare = spec.replace(/^\[\*?|\]$|^\{|\}$/g, '');
      assert.ok(specs.has(spec) || spec.startsWith('enum:') || types.includes(bare) || schema.kinds[bare], name + '.' + field + ': ' + spec);
    }
    for (const alias of Object.values(def.aliases || {})) assert.ok(def.fields[alias], name + ': the alias names a field');
    for (const required of def.required || []) assert.ok(Object.keys(def.fields || {}).includes(required) || def.extends, name + ': ' + required);
  }
  for (const [iface, kinds] of Object.entries(schema.kinds)) for (const type of Object.values(kinds)) assert.ok(types.includes(type), iface + ' -> ' + type);
  for (const type of Object.values(schema.manifestKinds)) assert.ok(type === null || types.includes(type), String(type));
});
