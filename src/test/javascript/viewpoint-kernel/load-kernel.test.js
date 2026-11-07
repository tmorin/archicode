'use strict';
// loadViewpointKernel fetches viewpoint_kernel.wasm beside the page: streaming when the type is application/wasm, the bytes read otherwise;
// a page with no meta, an HTTP error and a network error each have their sentence, and a failure is not remembered.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');

const states = (kernel) =>
  kernel.compare({
    on_one_chain: true,
    from: { application: [], technology: [] },
    to: { application: [], technology: [] }
  });

test('a file served as application/wasm is compiled while it streams', async () => {
  const sandbox = createApp({ kernelType: 'application/wasm' });
  const kernel = await sandbox.loadViewpointKernel();
  assert.equal(typeof kernel.compute, 'function');
  assert.ok(states(kernel));
});

test('a file served as application/wasm with a parameter, which streaming refuses, is read as bytes', async () => {
  const sandbox = createApp({ kernelType: 'application/wasm; charset=binary' });
  assert.equal(typeof (await sandbox.loadViewpointKernel()).compute, 'function');
});

test('a file served with another type, or none, is read as bytes and still loads', async () => {
  for (const kernelType of ['text/plain', null]) {
    const sandbox = createApp({ kernelType });
    assert.equal(typeof (await sandbox.loadViewpointKernel()).compute, 'function', String(kernelType));
  }
});

test('a page with no meta for the file says so', async () => {
  const sandbox = createApp({ kernelMeta: false });
  await assert.rejects(sandbox.loadViewpointKernel(), { message: 'The page names no viewpoint_kernel.wasm file.' });
});

test('an HTTP error names the status and the address', async () => {
  const sandbox = createApp({ kernelFetch: async () => new Response('no', { status: 404 }) });
  await assert.rejects(sandbox.loadViewpointKernel(), {
    message: 'The viewpoint kernel could not be loaded: HTTP 404 from http://editor.test/assets/viewpoint_kernel.wasm.'
  });
});

test('a network error names the address and the cause', async () => {
  const sandbox = createApp({
    kernelFetch: async () => {
      throw new TypeError('Failed to fetch');
    }
  });
  await assert.rejects(sandbox.loadViewpointKernel(), {
    message:
      'The viewpoint kernel could not be loaded from http://editor.test/assets/viewpoint_kernel.wasm: Failed to fetch'
  });
});

test('a failure is not remembered: the next call fetches again', async () => {
  let calls = 0;
  const bytes = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '../../../main/resources/editor-webapp/assets/viewpoint_kernel.wasm')
  );
  const sandbox = createApp({
    kernelFetch: async () => {
      calls++;
      if (calls === 1) throw new TypeError('offline');
      return new Response(bytes, { status: 200, headers: { 'content-type': 'application/wasm' } });
    }
  });
  await assert.rejects(sandbox.loadViewpointKernel());
  const kernel = await sandbox.loadViewpointKernel();
  assert.equal(typeof kernel.compute, 'function');
  assert.equal(calls, 2);
  assert.equal(await sandbox.loadViewpointKernel(), kernel, 'a success is remembered');
  assert.equal(calls, 2);
  assert.ok(vm.isContext(sandbox));
});
