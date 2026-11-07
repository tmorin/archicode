'use strict';
// loadViewpointKernel loads viewpoint_kernel.js beside the page, a classic script that holds the WebAssembly in base64 (a page
// opened from a disk may load a script but not fetch a file): a page with no meta, a script that does not load and one that
// defines nothing each have their sentence, a failure is not remembered, and the string is dropped once decoded.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');

const ADDRESS = 'http://editor.test/assets/viewpoint_kernel.js';

const states = (kernel) =>
  kernel.compare({
    on_one_chain: true,
    from: { application: [], technology: [] },
    to: { application: [], technology: [] }
  });

test('the kernel is loaded from the script beside the page and computes', async () => {
  const sandbox = createApp();
  const kernel = await sandbox.loadViewpointKernel();
  assert.equal(typeof kernel.compute, 'function');
  assert.ok(states(kernel));
});

test('the base64 string is dropped from the page once the bytes are decoded', async () => {
  const sandbox = createApp();
  await sandbox.loadViewpointKernel();
  assert.equal(sandbox.ArchiCodeKernelWasm, undefined);
});

test('a page with no meta for the script says so', async () => {
  const sandbox = createApp({ kernelMeta: false });
  await assert.rejects(sandbox.loadViewpointKernel(), { message: 'The page names no viewpoint_kernel.js file.' });
});

test('a script that does not load names the address and the cause', async () => {
  const sandbox = createApp({ kernelScript: () => 'error' });
  await assert.rejects(sandbox.loadViewpointKernel(), {
    message: `The viewpoint kernel could not be loaded from ${ADDRESS}: the script ${ADDRESS} could not be loaded`
  });
});

test('a script that runs and defines nothing says so', async () => {
  const sandbox = createApp({ kernelScript: () => 'empty' });
  await assert.rejects(sandbox.loadViewpointKernel(), {
    message: `The script ${ADDRESS} did not define the viewpoint kernel.`
  });
});

test('a failure is not remembered: the next call loads again, and a success is remembered', async () => {
  const sandbox = createApp({ kernelScript: (call) => (call === 1 ? 'error' : 'ok') });
  await assert.rejects(sandbox.loadViewpointKernel());
  const kernel = await sandbox.loadViewpointKernel();
  assert.equal(typeof kernel.compute, 'function');
  assert.equal(await sandbox.loadViewpointKernel(), kernel, 'a success is remembered');
  assert.ok(vm.isContext(sandbox));
});
