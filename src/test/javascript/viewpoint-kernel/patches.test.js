'use strict';
// `apply_patches`, the fourth entry point of the viewpoint kernel, called through the WebAssembly the editor embeds (and the CLI
// translates): the ordered patches of a plateau (REMOVE, SET, ADD, MERGE) applied to the JSON of a workspace, with the nodes each
// one touched, and an error that names the plateau, the rank and the selector of the patch that missed.
//
// The cases are in `patch-cases.json`, the very file `cargo test` reads (src/main/rust/viewpoint-kernel/src/patch_tests.rs): the
// same cases through Rust and through the module the page carries. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const HTML = path.join(REPO, 'src/main/resources/editor-webapp/standalone.html');
const WASM = path.join(REPO, 'src/main/wasm/viewpoint_kernel.wasm');
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'patch-cases.json'), 'utf8'));

/** The module of standalone.html, instantiated as the page does. */
async function loadEmbeddedKernel() {
  const html = fs.readFileSync(HTML, 'utf8');
  const block = html.match(/<script type="application\/octet-stream" id="viewpoint-kernel-wasm">([^<]+)<\/script>/);
  assert.ok(block, 'the kernel is embedded in standalone.html');
  const bytes = Buffer.from(block[1].trim(), 'base64');
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const x = instance.exports;
  const call = (name, input) => {
    const data = Buffer.from(typeof input === 'string' ? input : JSON.stringify(input), 'utf8');
    const ptr = x.alloc(data.length);
    new Uint8Array(x.memory.buffer, ptr, data.length).set(data);
    const length = x[name](ptr, data.length);
    const text = Buffer.from(new Uint8Array(x.memory.buffer, x.result_ptr(), length)).toString('utf8');
    x.dealloc(ptr, data.length);
    return text;
  };
  return {
    bytes,
    exports: x,
    raw: (input) => call('apply_patches', input),
    apply: (input) => JSON.parse(call('apply_patches', input)),
    facet: (input) => JSON.parse(call('apply_facet', input))
  };
}

/** `set`, `append` and `remove` at a JSON pointer: how a case says what its workspace is, from the base. */
function edit(doc, step) {
  const at = (pointer) => {
    const cut = pointer.lastIndexOf('/');
    let parent = doc;
    for (const key of pointer.slice(1, cut).split('/').filter(Boolean)) parent = parent[key];
    return [parent, pointer.slice(cut + 1)];
  };
  if (step.set !== undefined) {
    const [parent, last] = at(step.set);
    parent[last] = step.value;
  } else if (step.append !== undefined) {
    const list = step.append
      .slice(1)
      .split('/')
      .reduce((node, key) => node[key], doc);
    assert.ok(Array.isArray(list), 'no list at ' + step.append);
    list.push(step.value);
  } else if (step.remove !== undefined) {
    const [parent, last] = at(step.remove);
    if (Array.isArray(parent)) parent.splice(Number(last), 1);
    else {
      assert.ok(last in parent, 'nothing to remove at ' + step.remove);
      delete parent[last];
    }
  } else assert.fail('an edit is a set, an append or a remove: ' + JSON.stringify(step));
}

function request(c, workspace = CASES.workspace) {
  const r = { workspace, patches: c.patches };
  if (c.plateau !== undefined) r.plateau = c.plateau;
  return r;
}

test('the module the editor embeds is the one the CLI loads, and it exports apply_patches next to the other entry points', async () => {
  const kernel = await loadEmbeddedKernel();
  assert.ok(
    Buffer.compare(kernel.bytes, fs.readFileSync(WASM)) === 0,
    'the same bytes in standalone.html and in src/main/wasm'
  );
  for (const name of ['alloc', 'dealloc', 'compute', 'apply_facet', 'compare', 'apply_patches', 'result_ptr', 'memory'])
    assert.ok(name in kernel.exports, name + ' is exported');
});

test('the list of cases has a success and a failure for every operator, and the main errors', () => {
  const ok = CASES.cases.filter((c) => !c.error && !c.error_contains);
  for (const operator of ['REMOVE', 'SET', 'ADD', 'MERGE']) {
    assert.ok(
      ok.some((c) => c.patches.some((p) => p.operator === operator)),
      operator + ' has a case that succeeds'
    );
    assert.ok(
      CASES.cases.some((c) => (c.error || c.error_contains) && c.patches.some((p) => p.operator === operator)),
      operator + ' has a case that fails'
    );
  }
  const sentences = CASES.cases.map((c) => c.error || (c.error_contains || []).join('')).filter(Boolean);
  for (const piece of [
    'selects nothing, there is no element',
    'selects nothing, at least one node is expected',
    'nodes, ',
    'expected',
    'unsupported operator',
    'invalid JSONPath',
    'outside the elements',
    'would change the reference',
    'cannot be changed',
    'needs a `value`',
    'needs a `field`',
    'MERGE merges an object',
    'ADD appends to a list',
    'has no relationship to',
    'where` finds one',
    'REMOVE takes no',
    '`expect` goes with',
    '`layer` goes with',
    'invalid patch',
    'would remove an `id`',
    '`field` is empty'
  ]) {
    assert.ok(
      sentences.some((s) => s.includes(piece)),
      'no case for: ' + piece
    );
  }
});

for (const c of CASES.cases) {
  test(c.name, async () => {
    const kernel = await loadEmbeddedKernel();
    const answer = kernel.apply(request(c));
    if (c.error !== undefined || c.error_contains !== undefined) {
      assert.equal(typeof answer.error, 'string', 'an error: ' + JSON.stringify(answer).slice(0, 300));
      if (c.error !== undefined) assert.equal(answer.error, c.error);
      for (const piece of c.error_contains || [])
        assert.ok(
          answer.error.includes(piece),
          JSON.stringify(answer.error) + ' does not contain ' + JSON.stringify(piece)
        );
      assert.deepEqual(answer.patch, c.error_patch, 'error.patch');
      assert.equal(answer.workspace, undefined, 'an error returns no workspace');
    } else {
      assert.equal(answer.error, undefined);
      const expected = structuredClone(CASES.workspace);
      for (const step of c.edits) edit(expected, step);
      assert.deepEqual(answer.workspace, expected, 'workspace');
      assert.deepEqual(answer.patches, c.reports, 'reports');
      assert.equal(answer.version, 5);
    }
  });
}

test('the answer is the same bytes every time, and a patch keeps the order of the keys of the workspace', async () => {
  const kernel = await loadEmbeddedKernel();
  const input = {
    workspace: CASES.workspace,
    plateau: 'saas',
    patches: [
      { operator: 'REMOVE', target: 'shop' },
      { operator: 'MERGE', 'json-path': "$.application..elements[?(@.id == 'tax')]", field: 'tags', value: { a: 'b' } }
    ]
  };
  const first = kernel.raw(input);
  assert.equal(first, kernel.raw(input));
  assert.ok(
    first.indexOf('"name":"Demo"') < first.indexOf('"application"') &&
      first.indexOf('"application"') < first.indexOf('"styles"'),
    'the keys of the workspace keep their order'
  );
});

test('a call without patches, or with patches null, gives the workspace back; what is not a request is an error', async () => {
  const kernel = await loadEmbeddedKernel();
  for (const input of [
    { workspace: CASES.workspace },
    { workspace: CASES.workspace, patches: null },
    { workspace: CASES.workspace, patches: [] }
  ]) {
    const answer = kernel.apply(input);
    assert.deepEqual(answer.workspace, CASES.workspace);
    assert.deepEqual(answer.patches, []);
  }
  assert.ok(kernel.apply('{').error.includes('invalid input'));
  assert.ok(kernel.apply({}).error.includes('missing field `workspace`'));
  assert.ok(kernel.apply({ workspace: [], patches: [] }).error.includes('`workspace` is a list, not an object'));
  assert.equal(kernel.apply('{').patch, undefined, 'an error that is not about a patch has no patch');
});
