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
  'archicode.morin.io/component, archicode.morin.io/container, archicode.morin.io/environment, archicode.morin.io/node, archicode.morin.io/person, archicode.morin.io/plateau, ' +
  'archicode.morin.io/solution, archicode.morin.io/story, archicode.morin.io/system, archicode.morin.io/view';

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
  // a group is an element nested in another, not a kind: container-group, solution-group and system-group give the one sentence of an unknown kind, as on the command line (#79; N56 to N58 of negative-cases.json)
  for (const group of ['container-group', 'solution-group', 'system-group']) {
    assert.equal(errorOf(manifest('  id: g\n', 'header:\n  kind: "archicode.morin.io/' + group + '"\n  version: "1"\n')), 'unrecognized `header.kind` "archicode.morin.io/' + group + '" (known: ' + KNOWN_KINDS + ')');
  }
});

test('workspace.yaml: the keys and the shapes of the settings, the styles and the formatters are the command line\'s', () => {
  const problem = (text) => app.workspaceProblem(app.parseYaml(text));
  assert.equal(problem('settings:\n  name: Shop\n'), null);
  assert.equal(problem('settings:\n  foo: 1\n'), 'unknown key `foo` (known: current, facets, manifests, name, relationships, views) at `settings.foo`');
  assert.equal(problem('foo: 1\n'), 'unknown key `foo` (known: application, formatters, settings, stories, story, styles, technology, view, views) at `foo`');
  assert.equal(problem('settings:\n  facets:\n    global-enabled: false\n    customs:\n      - name: a\n        hide-unlinked: true\n        actions:\n          - operator: REMOVE\n            json-path: "$"\n'), null, 'the other names of a key');
  assert.equal(problem('settings:\n  facets:\n    customs:\n      - name: a\n        actions:\n          - operator: REMOVE\n'), 'Missing settings.facets.customs[0].actions[0].json-path');
  assert.equal(problem('settings:\n  manifests:\n    paths: m\n'), 'the value has the wrong shape (found a string) at `settings.manifests.paths`');
  assert.equal(problem('settings:\n  views:\n    labels:\n      a: b\n    properties:\n      a: {x: 1}\n'), null);
  assert.equal(problem('styles:\n  composite:\n    line-style: x\n'), 'the value has the wrong shape (found a string) at `styles.composite.line-style`');
  assert.equal(problem('styles:\n  composite:\n    line-style: ""\n    shadowing: ""\n'), null, 'an empty text is no number and no boolean');
  assert.equal(problem('formatters:\n  link:\n    labl: x\n'), 'unknown key `labl` (known: label, qualifiers) at `formatters.link.labl`');
  assert.equal(problem('technology:\n  elements:\n    - kind: environment\n      id: e\n      elements:\n        - kind: node\n          id: n\n'), null);
  assert.equal(problem('technology:\n  elements:\n    - id: e\n'), 'missing `kind` (known: environment) at `technology.elements[0]`');
  assert.equal(problem('settings:\n  current: [a]\n'), 'the value has the wrong shape (found an array) at `settings.current`');
  assert.equal(problem('settings:\n  plateaus:\n    - id: a\n      path: p\n      colour: red\n'), vm.runInContext('REMOVED_PLATEAUS_KEY', app), 'the key that no longer exists is told first, and nothing else is');
  assert.equal(problem('settings:\n  foo: 1\n  plateaus: []\n'), vm.runInContext('REMOVED_PLATEAUS_KEY', app), 'whatever else the file holds');
});

test('a workspace.yaml the editor refuses is a fatal error that says the sentence, and the folder is not opened', async () => {
  const mem = memFolder({ 'workspace.yaml': 'settings:\n  foo: 1\n' });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.fatalError, 'Could not read/parse workspace.yaml: unknown key `foo` (known: current, facets, manifests, name, relationships, views) at `settings.foo`');
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

// ---- run 0092 (wave 015, W-4): issues #80 and #85. The cases that both tools run are in negative-cases.json (N59 to N77) and plateau-model-cases.json (M65 to M80).

test('a header field the command line types as text is the text as written: yes, On and TRUE are not booleans there (#85)', () => {
  const header = (extra) => 'header:\n  kind: "archicode.morin.io/container"\n' + extra + '  version: "1"\ncontent:\n  id: c\n';
  for (const word of ['yes', 'Yes', 'YES', 'on', 'On', 'ON', 'no', 'No', 'off', 'OFF', 'True', 'TRUE', 'False', 'true', 'false']) {
    const parsed = app.parseManifestText(header('  parent: ' + word + '\n  plateau: ' + word + '\n'));
    assert.equal(parsed.header.parent, word, 'parent: ' + word);
    assert.equal(parsed.header.plateau, word, 'plateau: ' + word);
  }
  const flow = app.parseManifestText('header: {kind: "archicode.morin.io/container", version: yes, parent: On, plateau: "yes"}\ncontent: {id: c}\n');
  assert.deepEqual([flow.header.version, flow.header.parent, flow.header.plateau], ['yes', 'On', 'yes'], 'in a flow mapping too');
  // nothing else of the header changes: a number is a number, null is no value, a quoted text is a text
  const other = app.parseManifestText(header('  parent: 5\n  plateau: ~\n'));
  assert.deepEqual([other.header.parent, other.header.plateau], [5, null]);
  // the kind is an enum, which the command line reads by the kind of the value: a boolean is the wrong shape, not an unknown kind
  assert.equal(errorOf(manifest('  id: s\n', 'header:\n  kind: yes\n  version: "1"\n')), 'the value has the wrong shape (found a boolean) at `header.kind`');
  // the content keeps reading a YAML 1.1 boolean as the boolean, as the command line does (it says `true` for it)
  const content = app.parseManifestText(manifest('  id: yes\n  name: No\n'));
  assert.deepEqual([content.content.id, content.content.name], [true, false]);
  assert.equal(content.error, null);
});

test('a manifest that says parent: yes is saved with that line as it was written (#85)', () => {
  const text = '# the cart\nheader:\n  kind: "archicode.morin.io/container"\n  parent: yes\n  plateau: On\n  version: "1"\ncontent:\n  id: c\n  name: C\n';
  const parsed = app.parseManifestText(text);
  parsed.content.name = 'Cart';
  assert.equal(app.patchYamlText(text, { header: parsed.header, content: parsed.content }), text.replace('name: C', 'name: Cart'));
  const untouched = app.parseManifestText(text);
  assert.equal(app.patchYamlText(text, { header: untouched.header, content: untouched.content }), text, 'no edit, no change');
});

test('a null where the command line reads an absent value is absent here too (#80)', () => {
  const settings = (text) => JSON.parse(JSON.stringify(app.parseSettings(app.parseYaml(text).settings)));
  assert.deepEqual(settings('settings:\n  manifests:\n    paths: [null, a, ~, "", b]\n').manifests.paths, ['a', '', 'b'], 'an item with no value is no item');
  assert.deepEqual(settings('settings:\n  manifests:\n    paths: [null]\n').manifests.paths, [], 'a list of nothing is an empty list, not the default folder');
  assert.deepEqual(settings('settings:\n  manifests:\n    paths:\n').manifests.paths, ['manifests'], 'a key with nothing after it is absent');
  assert.equal(errorOf(manifest('  id: s\n  elements:\n')), null);
  assert.equal(errorOf(manifest('  id: s\n  elements: [null, ~]\n')), null);
  assert.equal(errorOf(manifest('  id: s\n  relationships:\n    - destination: s\n      qualifiers:\n      tags:\n')), null);
  assert.equal(errorOf('header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: t\n  steps:\n'), null);
});

test('an item of a list of elements that is a list is the wrong shape, as it is for the command line (#80)', () => {
  assert.equal(errorOf(manifest('  id: s\n  elements: [[1]]\n')), 'the value has the wrong shape (found an array) at `elements[0]`');
  assert.equal(errorOf(manifest('  id: s\n  elements:\n    - kind: container\n      id: c\n      elements:\n        - [a]\n')), 'the value has the wrong shape (found an array) at `elements[0].elements[0]`');
  assert.equal(errorOf(manifest('  id: s\n  elements: [5]\n')), 'missing `kind` (known: container, group) at `elements[0]`', 'a scalar is an element with no kind');
});

test('the sentences name the keys of the facets as the manual writes them, and the other spelling is still read (#80)', () => {
  const problem = (text) => app.workspaceProblem(app.parseYaml(text));
  assert.equal(problem('settings:\n  facets:\n    nothing: 1\n'), 'unknown key `nothing` (known: customs, directory-name-template, global-enabled) at `settings.facets.nothing`');
  assert.equal(problem('settings:\n  facets:\n    customs:\n      - nothing: 1\n'), 'unknown key `nothing` (known: actions, hide-unlinked, name) at `settings.facets.customs[0].nothing`');
  assert.equal(problem('settings:\n  facets:\n    customs:\n      - name: a\n        actions:\n          - nothing: 1\n'), 'unknown key `nothing` (known: json-path, operator) at `settings.facets.customs[0].actions[0].nothing`');
  assert.equal(problem('settings:\n  facets:\n    globalEnabled: false\n    directoryNameTemplate: "%s"\n    customs:\n      - name: a\n        hideUnlinked: true\n        actions:\n          - operator: REMOVE\n            jsonPath: "$"\n'), null);
  assert.equal(problem('settings:\n  facets:\n    customs:\n      - name: a\n        actions:\n          - jsonPath: "$"\n'), 'Missing settings.facets.customs[0].actions[0].operator');
});

test('a number is no value of an enum, a value of an enum is told without the blanks around it, and a whole number fits an int (#80)', () => {
  const problem = (text) => app.workspaceProblem(app.parseYaml(text));
  const view = (layer) => errorOf('header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: v\n  viewpoint: p\n  layer: ' + layer + '\n');
  assert.equal(view('1'), 'unrecognized `layer` "1" (known: APPLICATION, TECHNOLOGY)');
  assert.equal(view('"  tech  "'), 'unrecognized `layer` "tech" (known: APPLICATION, TECHNOLOGY)');
  assert.equal(view('" technology "'), null, 'the blanks do not count when it is a value');
  const gap = (value) => problem('styles:\n  composite:\n    line-gap: ' + value + '\n');
  assert.equal(gap('2147483647'), null);
  assert.equal(gap('-2147483648'), null);
  assert.equal(gap('2147483648'), 'Numeric value (2147483648) out of range of int (-2147483648 - 2147483647) at `styles.composite.line-gap`');
  assert.equal(gap('-9999999999'), 'Numeric value (-9999999999) out of range of int (-2147483648 - 2147483647) at `styles.composite.line-gap`');
  assert.equal(gap('"9999999999"'), 'the value has the wrong shape (found a string) at `styles.composite.line-gap`', 'a text is a text that is no int, as it is for the command line');
  assert.equal(gap('"５"'), null, 'any digit, as the command line reads it');
});

test('KNOWN DIFFERENCE (issue #103): a plain scalar spelled as a YAML 1.1 number that JavaScript would print another way is kept as text by the page, the command line reads a number', () => {
  const problem = (text) => app.workspaceProblem(app.parseYaml(text));
  // where a number is expected the page refuses the text (the command line accepts each of them, case N77 of negative-cases.json)
  for (const spelled of ['0x1F', '0b11', '1_0', '5.0', '1e2', '1E2', '.5', '1.']) {
    assert.equal(problem('styles:\n  composite:\n    line-gap: ' + spelled + '\n'), 'the value has the wrong shape (found a string) at `styles.composite.line-gap`', spelled);
  }
  assert.equal(problem('styles:\n  composite:\n    line-gap: 5\n'), null);
  assert.equal(problem('styles:\n  composite:\n    line-gap: 012\n'), null, 'digits only are a whole number for both');
  for (const spelled of ['0x1', '012']) assert.equal(problem('styles:\n  composite:\n    shadowing: ' + spelled + '\n'), 'the value has the wrong shape (found a string) at `styles.composite.shadowing`', spelled);
  // where a text is expected the page keeps the spelling, the command line says the number (`id: 010` is the reference `8` there: YamlOneDotOneNumbersTest.java)
  const id = (spelled) => app.parseManifestText(manifest('  id: ' + spelled + '\n')).content.id;
  assert.equal(id('010'), '010');
  assert.equal(id('0x1F'), '0x1F');
  assert.equal(id('1.50'), '1.50');
  assert.equal(id('1_000'), '1_000');
  assert.equal(id('1e3'), '1e3');
  // and an id with a dot (issue #104) is judged on the spelling: `1.50` is refused as `1.50` (the command line says `1.5`), `1e3` has no dot for the page and is `1000.0` for the command line, which refuses it
  assert.equal(app.parseManifestText(manifest('  id: 1.50\n')).error, 'the id `1.50` contains a dot, which separates the levels of a reference, at `content.id`');
  assert.equal(app.parseManifestText(manifest('  id: 1e3\n')).error, null);
  // and a header.parent of 0 is no parent for the page (a falsy number), the reference `0.c` for the command line
  const parent = app.parseManifestText('header:\n  kind: "archicode.morin.io/container"\n  parent: 0\n  version: "1"\ncontent:\n  id: c\n').header.parent;
  assert.equal(parent, 0);
});

test('KNOWN DIFFERENCE: the page does not tell the line and the column of a file, the command line does (negative-cases.json)', () => {
  const sentence = errorOf(manifest('  id: s\n  foo: 1\n'));
  assert.equal(sentence, 'unknown key `foo` (known: description, elements, id, name, qualifiers, relationships, replaces, tags) at `foo`');
  assert.doesNotMatch(sentence, /\(line \d+, column \d+\)/);
});

test('a header line that says parent: yes stays as written when the file is saved with its comments and a flow list (#85)', () => {
  const text = '# the cart\nheader: {kind: "archicode.morin.io/container", parent: yes, version: "1"}\ncontent:\n  id: c\n  name: C  # the name\n  qualifiers: [a, b]\n';
  const parsed = app.parseManifestText(text);
  assert.equal(parsed.header.parent, 'yes');
  parsed.content.name = 'Cart';
  assert.equal(app.patchYamlText(text, { header: parsed.header, content: parsed.content }), text.replace('name: C ', 'name: Cart '));
  const keyColumn = '# the cart\nheader:\n  kind: "archicode.morin.io/container"\n  parent: On\n  version: "1"\ncontent:\n  id: c\n  name: C\n  qualifiers:\n  - a\n  - b\n';
  const again = app.parseManifestText(keyColumn);
  again.content.name = 'Cart';
  assert.equal(app.patchYamlText(keyColumn, { header: again.header, content: again.content }), keyColumn.replace('name: C', 'name: Cart'), 'a list written at the column of its key too');
});

test('a scalar of settings that has nothing after its key is absent: the default is read (#80)', () => {
  const settings = (text) => JSON.parse(JSON.stringify(app.parseSettings(app.parseYaml(text).settings)));
  const read = settings('settings:\n  name:\n  current:\n  relationships:\n    default-synthetic-label:\n  views:\n    path:\n  facets:\n    global-enabled:\n    directory-name-template:\n');
  assert.equal(read.relationships.defaultSyntheticLabel, 'uses');
  assert.equal(read.views.path, 'views');
  assert.equal(read.facets.globalEnabled, true, 'the default, as the command line reads it');
  assert.equal(read.facets.directoryNameTemplate, '%s-%s');
  assert.equal(read.current, '');
});

test('an item with no value is no qualifier, no application and no use (#80)', async () => {
  const mem = memFolder({
    'workspace.yaml': 'settings:\n  manifests:\n    paths: [m]\n',
    'm/a.yaml': manifest('  id: s\n  qualifiers: [a, null, b]\n  relationships:\n    - destination: s\n      qualifiers:\n        -\n        - q\n'),
    'm/e.yaml': 'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\ncontent:\n  id: e\n  uses: [~, s]\n  elements:\n    - kind: node\n      id: n\n      applications: [null, s]\n'
  });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  const s = state.index.application.get('s');
  assert.deepEqual(JSON.parse(JSON.stringify(s.qualifiers)), ['a', 'b']);
  assert.deepEqual(JSON.parse(JSON.stringify(s.relationships[0].qualifiers)), ['q']);
  assert.deepEqual(JSON.parse(JSON.stringify(state.index.technology.get('e').uses)), ['s']);
  assert.deepEqual(JSON.parse(JSON.stringify(state.index.technology.get('e.n').applications)), ['s']);
});

test('KNOWN DIFFERENCE (issue #105): an item with no value in relationships is a relationship with no destination for the page, none for the command line', async () => {
  const mem = memFolder({ 'workspace.yaml': 'settings:\n  manifests:\n    paths: [m]\n', 'm/a.yaml': manifest('  id: s\n  relationships: [null]\n') });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.manifestFiles[0].error, null, 'it is read, not refused, as it is by the command line');
  assert.equal(state.index.application.get('s').relationships.length, 1, 'the page keeps the place of the item (the form of a relationship addresses the file by position)');
});
